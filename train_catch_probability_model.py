import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    roc_auc_score, log_loss, precision_recall_curve, 
    average_precision_score, classification_report, confusion_matrix
)
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import pickle
import warnings
warnings.filterwarnings('ignore')

def load_and_prepare_data(separation_file='train/input_with_separation.csv', 
                          supplementary_file='supplementary_data.csv'):
    """
    Load data and merge with supplementary information.
    """
    print("Loading data...")
    
    # Load separation features data
    print("  Loading separation features data...")
    df = pd.read_csv(separation_file, low_memory=False)
    
    # Load supplementary data
    print("  Loading supplementary data...")
    supp_df = pd.read_csv(supplementary_file, low_memory=False)
    
    # Merge on game_id and play_id
    print("  Merging data...")
    df = df.merge(
        supp_df[['game_id', 'play_id', 'pass_result', 'team_coverage_type', 
                 'offense_formation', 'down', 'yards_to_go', 'yardline_number']],
        on=['game_id', 'play_id'],
        how='left'
    )
    
    print(f"  Total rows: {len(df):,}")
    return df

def create_target_variable(df):
    """
    Create target variable: is_targeted (1 if player_to_predict==True, 0 otherwise)
    Also create catch_outcome (1 if targeted AND caught, 0 if targeted but not caught)
    """
    print("\nCreating target variables...")
    
    # is_targeted: was this receiver the target?
    df['is_targeted'] = (df['player_to_predict'] == True).astype(int)
    
    # catch_outcome: did the targeted receiver catch the ball?
    # pass_result: 'C' = catch, 'I' = incomplete, 'IN' = interception, etc.
    df['catch_outcome'] = np.nan
    targeted_mask = df['is_targeted'] == 1
    df.loc[targeted_mask, 'catch_outcome'] = (
        df.loc[targeted_mask, 'pass_result'] == 'C'
    ).astype(int)
    
    print(f"  Targeted receivers: {df['is_targeted'].sum():,}")
    print(f"  Targeted and caught: {df['catch_outcome'].sum():.0f}")
    print(f"  Targeted but not caught: {(targeted_mask & (df['catch_outcome'] == 0)).sum():.0f}")
    
    return df

def engineer_features(df):
    """
    Engineer features for the model.
    """
    print("\nEngineering features...")
    
    # Filter to receivers only
    receiver_positions = ['WR', 'TE', 'RB']
    df_receivers = df[
        (df['player_side'] == 'Offense') & 
        (df['player_position'].isin(receiver_positions))
    ].copy()
    
    print(f"  Receiver rows: {len(df_receivers):,}")
    
    # Calculate throw_frame (max frame_id for each play)
    throw_frames = df_receivers.groupby(['game_id', 'play_id'])['frame_id'].max().reset_index()
    throw_frames.columns = ['game_id', 'play_id', 'throw_frame']
    df_receivers = df_receivers.merge(throw_frames, on=['game_id', 'play_id'], how='left')
    
    # Temporal features
    df_receivers['frames_until_throw'] = df_receivers['throw_frame'] - df_receivers['frame_id']
    df_receivers['frame_progress'] = df_receivers['frame_id'] / df_receivers['throw_frame']
    
    # Distance to ball landing point
    df_receivers['distance_to_ball_land'] = np.sqrt(
        (df_receivers['x'] - df_receivers['ball_land_x'])**2 + 
        (df_receivers['y'] - df_receivers['ball_land_y'])**2
    )
    
    # Speed and acceleration differentials
    df_receivers['speed_differential'] = (
        df_receivers['receiver_speed'] - df_receivers['nearest_defender_speed']
    )
    df_receivers['acceleration_differential'] = (
        df_receivers['receiver_acceleration'] - df_receivers['nearest_defender_acceleration']
    )
    
    # Field position features
    df_receivers['is_red_zone'] = (
        (df_receivers['yardline_number'] <= 20) & 
        (df_receivers['yardline_number'].notna())
    ).astype(int)
    
    # Relative separation (normalized by field position)
    df_receivers['relative_separation'] = (
        df_receivers['nearest_defender_distance'] / 
        (df_receivers['absolute_yardline_number'] + 1)
    )
    
    # Sort by play and frame for temporal feature calculation
    df_receivers = df_receivers.sort_values(['game_id', 'play_id', 'nfl_id', 'frame_id'])
    
    # Calculate change in separation from previous frame
    df_receivers['separation_change'] = df_receivers.groupby(
        ['game_id', 'play_id', 'nfl_id']
    )['nearest_defender_distance'].diff()
    
    # Rolling averages (last 3 frames)
    df_receivers['separation_rolling_mean'] = df_receivers.groupby(
        ['game_id', 'play_id', 'nfl_id']
    )['nearest_defender_distance'].transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    
    df_receivers['speed_rolling_mean'] = df_receivers.groupby(
        ['game_id', 'play_id', 'nfl_id']
    )['receiver_speed'].transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    
    print(f"  Features engineered. Final rows: {len(df_receivers):,}")
    
    return df_receivers

def prepare_features_for_modeling(df):
    """
    Select and prepare features for modeling.
    Target model uses only real-time features (no future information).
    Catch model can use future features since we know the throw happened.
    """
    print("\nPreparing features for modeling...")
    
    # Real-time features (available before throw) - for target prediction
    realtime_feature_cols = [
        # Separation features
        'nearest_defender_distance',
        'separation_x', 'separation_y', 'separation_angle',
        'second_nearest_defender_distance',
        
        # Speed and acceleration
        'receiver_speed', 'receiver_acceleration',
        'nearest_defender_speed', 'nearest_defender_acceleration',
        'speed_differential', 'acceleration_differential',
        
        # Position
        'x', 'y',
        'absolute_yardline_number',
        
        # Temporal (current frame only - no future info)
        'frame_id',
        
        # Field context
        'is_red_zone', 'down', 'yards_to_go',
        'relative_separation',
        
        # Temporal trends (based on past frames - available in real-time)
        'separation_change',
        'separation_rolling_mean',
        'speed_rolling_mean',
        
        # Direction and orientation
        'dir', 'o',
        
        # Play context
        'play_direction'
    ]
    
    # Future features (only available after throw) - for catch prediction only
    future_feature_cols = [
        'distance_to_ball_land',
        'frames_until_throw',
        'frame_progress'
    ]
    
    # Categorical features to encode
    categorical_cols = ['player_position', 'team_coverage_type', 'offense_formation', 'play_direction']
    
    # Encode categorical features
    label_encoders = {}
    for col in categorical_cols:
        if col in df.columns:
            le = LabelEncoder()
            # Fill NaN with 'UNKNOWN' before encoding
            df[col + '_encoded'] = le.fit_transform(df[col].fillna('UNKNOWN').astype(str))
            label_encoders[col] = le
            print(f"  Encoded {col}: {len(le.classes_)} categories")
    
    # Select real-time features for target prediction model (NO future information)
    target_features = [col for col in realtime_feature_cols if col in df.columns]
    # Remove any categorical columns that weren't encoded
    target_features = [col for col in target_features if col not in categorical_cols]
    # Add encoded categoricals
    for col in categorical_cols:
        if (col + '_encoded') in df.columns:
            target_features.append(col + '_encoded')
    print(f"  Target model: {len(target_features)} real-time features (no future info)")
    
    # Select all features (including future) for catch prediction model
    catch_features = [col for col in (realtime_feature_cols + future_feature_cols) if col in df.columns]
    # Remove any categorical columns that weren't encoded
    catch_features = [col for col in catch_features if col not in categorical_cols]
    # Add encoded categoricals
    for col in categorical_cols:
        if (col + '_encoded') in df.columns:
            catch_features.append(col + '_encoded')
    print(f"  Catch model: {len(catch_features)} features (includes future info)")
    
    # Create feature matrix for target prediction (real-time only)
    X_target = df[target_features].copy()
    
    # Fill remaining NaN values with median for target features
    for col in X_target.columns:
        if X_target[col].dtype in [np.float64, np.int64]:
            X_target[col] = X_target[col].fillna(X_target[col].median())
        else:
            X_target[col] = X_target[col].fillna(0)
    
    # Create feature matrix for catch prediction (includes future features)
    X_catch_full = df[catch_features].copy()
    
    # Fill NaN values for catch features
    for col in X_catch_full.columns:
        if X_catch_full[col].dtype in [np.float64, np.int64]:
            X_catch_full[col] = X_catch_full[col].fillna(X_catch_full[col].median())
        else:
            X_catch_full[col] = X_catch_full[col].fillna(0)
    
    # Reset index to ensure alignment
    X_target = X_target.reset_index(drop=True)
    X_catch_full = X_catch_full.reset_index(drop=True)
    df = df.reset_index(drop=True)
    
    # Store play identifiers for proper splitting
    play_info_target = df[['game_id', 'play_id', 'frame_id', 'nfl_id']].copy()
    
    # Target variable
    y_target = df['is_targeted'].values
    y_catch = df['catch_outcome'].values
    
    # Only keep rows where catch_outcome is not NaN (i.e., targeted receivers)
    catch_mask = ~np.isnan(y_catch)
    X_catch = X_catch_full[catch_mask].copy().reset_index(drop=True)
    y_catch_clean = y_catch[catch_mask]
    play_info_catch = play_info_target[catch_mask].copy().reset_index(drop=True)
    
    print(f"  Target prediction: {len(X_target)} samples")
    print(f"  Catch prediction: {len(X_catch)} samples (only targeted receivers)")
    
    return X_target, y_target, X_catch, y_catch_clean, target_features, catch_features, label_encoders, df, play_info_target, play_info_catch

def train_target_model(X, y, feature_names, play_info, test_size=0.2, random_state=42):
    """
    Train XGBoost model to predict if a receiver will be targeted.
    """
    print("\n" + "="*60)
    print("Training Target Prediction Model")
    print("="*60)
    
    # Split by play to avoid data leakage
    unique_plays = play_info[['game_id', 'play_id']].drop_duplicates()
    train_plays, test_plays = train_test_split(
        unique_plays, test_size=test_size, random_state=random_state
    )
    
    # Create masks for train/test
    train_mask = play_info.merge(
        train_plays, on=['game_id', 'play_id'], how='inner'
    ).index
    test_mask = play_info.merge(
        test_plays, on=['game_id', 'play_id'], how='inner'
    ).index
    
    X_train = X.loc[train_mask].copy()
    X_test = X.loc[test_mask].copy()
    y_train = y[train_mask]
    y_test = y[test_mask]
    
    print(f"Training set: {len(X_train):,} samples")
    print(f"Test set: {len(X_test):,} samples")
    print(f"Positive class rate (train): {y_train.mean():.4f}")
    print(f"Positive class rate (test): {y_test.mean():.4f}")
    
    # Calculate scale_pos_weight for class imbalance
    pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    print(f"Class imbalance ratio: {pos_weight:.2f}")
    
    # Train XGBoost model
    print("\nTraining XGBoost model...")
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='logloss',
        max_depth=6,
        learning_rate=0.1,
        n_estimators=200,
        scale_pos_weight=pos_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=random_state,
        n_jobs=-1
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Predictions
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    # Evaluation
    print("\nModel Evaluation:")
    print(f"  AUC-ROC: {roc_auc_score(y_test, y_pred_proba):.4f}")
    print(f"  Log Loss: {log_loss(y_test, y_pred_proba):.4f}")
    print(f"  Average Precision: {average_precision_score(y_test, y_pred_proba):.4f}")
    
    # Precision at different thresholds
    precision, recall, thresholds = precision_recall_curve(y_test, y_pred_proba)
    
    # Top-K accuracy (how often is actual target in top 3 predictions per play)
    print("\nTop-K Accuracy:")
    # This would require grouping by play, which we'll do in a more sophisticated way
    
    # Feature importance
    print("\nTop 15 Most Important Features:")
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(feature_importance.head(15).to_string(index=False))
    
    return model, X_test, y_test, y_pred_proba

def train_catch_model(X, y, feature_names, play_info, test_size=0.2, random_state=42):
    """
    Train XGBoost model to predict if a targeted receiver will catch the ball.
    """
    print("\n" + "="*60)
    print("Training Catch Probability Model")
    print("="*60)
    
    # Split by play to avoid data leakage
    unique_plays = play_info[['game_id', 'play_id']].drop_duplicates()
    train_plays, test_plays = train_test_split(
        unique_plays, test_size=test_size, random_state=random_state
    )
    
    # Create masks for train/test
    train_mask = play_info.merge(
        train_plays, on=['game_id', 'play_id'], how='inner'
    ).index
    test_mask = play_info.merge(
        test_plays, on=['game_id', 'play_id'], how='inner'
    ).index
    
    X_train = X.loc[train_mask].copy()
    X_test = X.loc[test_mask].copy()
    y_train = y[train_mask]
    y_test = y[test_mask]
    
    print(f"Training set: {len(X_train):,} samples")
    print(f"Test set: {len(X_test):,} samples")
    print(f"Catch rate (train): {y_train.mean():.4f}")
    print(f"Catch rate (test): {y_test.mean():.4f}")
    
    # Calculate scale_pos_weight
    pos_weight = (y_train == 0).sum() / (y_train == 1).sum() if y_train.sum() > 0 else 1.0
    print(f"Class imbalance ratio: {pos_weight:.2f}")
    
    # Train XGBoost model
    print("\nTraining XGBoost model...")
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='logloss',
        max_depth=6,
        learning_rate=0.1,
        n_estimators=200,
        scale_pos_weight=pos_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=random_state,
        n_jobs=-1
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Predictions
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    # Evaluation
    print("\nModel Evaluation:")
    print(f"  AUC-ROC: {roc_auc_score(y_test, y_pred_proba):.4f}")
    print(f"  Log Loss: {log_loss(y_test, y_pred_proba):.4f}")
    print(f"  Average Precision: {average_precision_score(y_test, y_pred_proba):.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Catch', 'Catch']))
    
    # Feature importance
    print("\nTop 15 Most Important Features:")
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(feature_importance.head(15).to_string(index=False))
    
    return model, X_test, y_test, y_pred_proba

def save_model(model, filename, feature_names, label_encoders=None):
    """Save model and metadata."""
    model_data = {
        'model': model,
        'feature_names': feature_names,
        'label_encoders': label_encoders
    }
    with open(filename, 'wb') as f:
        pickle.dump(model_data, f)
    print(f"\nModel saved to {filename}")

def main():
    print("="*60)
    print("Catch Probability Model Training")
    print("="*60)
    
    # Load and prepare data
    df = load_and_prepare_data()
    
    # Create target variables
    df = create_target_variable(df)
    
    # Engineer features
    df_receivers = engineer_features(df)
    
    # Prepare features for modeling
    X_target, y_target, X_catch, y_catch, target_feature_names, catch_feature_names, label_encoders, df_final, play_info_target, play_info_catch = prepare_features_for_modeling(df_receivers)
    
    # Train target prediction model (real-time features only)
    target_model, X_test_target, y_test_target, y_pred_target = train_target_model(
        X_target, y_target, target_feature_names, play_info_target
    )
    save_model(target_model, 'models/target_prediction_model.pkl', target_feature_names, label_encoders)
    
    # Train catch probability model (includes future features)
    catch_model, X_test_catch, y_test_catch, y_pred_catch = train_catch_model(
        X_catch, y_catch, catch_feature_names, play_info_catch
    )
    save_model(catch_model, 'models/catch_probability_model.pkl', catch_feature_names, label_encoders)
    
    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)
    print("\nModels saved:")
    print("  - models/target_prediction_model.pkl")
    print("  - models/catch_probability_model.pkl")

if __name__ == '__main__':
    import os
    os.makedirs('models', exist_ok=True)
    main()

