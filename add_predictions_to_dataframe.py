import pandas as pd
import numpy as np
import pickle
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

def load_models():
    """Load the trained models."""
    print("Loading trained models...")
    
    with open('models/target_prediction_model.pkl', 'rb') as f:
        target_model_data = pickle.load(f)
        target_model = target_model_data['model']
        target_feature_names = target_model_data['feature_names']
        target_label_encoders = target_model_data['label_encoders']
    
    with open('models/catch_probability_model.pkl', 'rb') as f:
        catch_model_data = pickle.load(f)
        catch_model = catch_model_data['model']
        catch_feature_names = catch_model_data['feature_names']
        catch_label_encoders = catch_model_data['label_encoders']
    
    print(f"  Target model: {len(target_feature_names)} features")
    print(f"  Catch model: {len(catch_feature_names)} features")
    
    return (target_model, target_feature_names, target_label_encoders,
            catch_model, catch_feature_names, catch_label_encoders)

def engineer_features(df):
    """Engineer the same features used in training."""
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
    
    # Relative separation
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

def prepare_features_for_prediction(df, feature_names, label_encoders):
    """Prepare features in the same way as training."""
    # Categorical features to encode
    categorical_cols = ['player_position', 'team_coverage_type', 'offense_formation', 'play_direction']
    
    # Encode categorical features using the same encoders from training
    df_encoded = df.copy()
    for col in categorical_cols:
        if col in df_encoded.columns and col in label_encoders:
            le = label_encoders[col]
            # Fill NaN with 'UNKNOWN' and encode
            encoded_values = df_encoded[col].fillna('UNKNOWN').astype(str)
            # Handle unseen values by mapping to 'UNKNOWN'
            encoded_values = encoded_values.apply(
                lambda x: x if x in le.classes_ else 'UNKNOWN'
            )
            # If 'UNKNOWN' is not in classes, add it
            if 'UNKNOWN' not in le.classes_:
                # Create a temporary encoder that includes UNKNOWN
                le_temp = LabelEncoder()
                all_values = list(le.classes_) + ['UNKNOWN']
                le_temp.fit(all_values)
                df_encoded[col + '_encoded'] = le_temp.transform(encoded_values)
            else:
                df_encoded[col + '_encoded'] = le.transform(encoded_values)
    
    # Select features that exist in dataframe
    available_features = [col for col in feature_names if col in df_encoded.columns]
    
    # Create feature matrix
    X = df_encoded[available_features].copy()
    
    # Fill remaining NaN values with median
    for col in X.columns:
        if X[col].dtype in [np.float64, np.int64]:
            X[col] = X[col].fillna(X[col].median())
        else:
            X[col] = X[col].fillna(0)
    
    # Ensure feature order matches training
    X = X[feature_names]
    
    return X

def add_predictions_to_dataframe(separation_file='train/input_with_separation.csv',
                                 supplementary_file='supplementary_data.csv',
                                 output_file='train/input_with_separation.csv'):
    """
    Load data, apply models, and add predictions to dataframe.
    """
    print("="*60)
    print("Adding Model Predictions to Dataframe")
    print("="*60)
    
    # Load models
    (target_model, target_feature_names, target_label_encoders,
     catch_model, catch_feature_names, catch_label_encoders) = load_models()
    
    # Load data
    print("\nLoading data...")
    print("  Loading separation features data...")
    df = pd.read_csv(separation_file, low_memory=False)
    
    print("  Loading supplementary data...")
    supp_df = pd.read_csv(supplementary_file, low_memory=False)
    
    print("  Merging data...")
    df = df.merge(
        supp_df[['game_id', 'play_id', 'pass_result', 'team_coverage_type', 
                 'offense_formation', 'down', 'yards_to_go', 'yardline_number']],
        on=['game_id', 'play_id'],
        how='left'
    )
    
    print(f"  Total rows: {len(df):,}")
    
    # Engineer features for receivers
    df_receivers = engineer_features(df)
    
    # Prepare features for target prediction (real-time only)
    print("\nPreparing features for target prediction...")
    X_target = prepare_features_for_prediction(df_receivers, target_feature_names, target_label_encoders)
    
    # Predict target probabilities
    print("  Predicting target probabilities...")
    target_probs = target_model.predict_proba(X_target)[:, 1]
    df_receivers['target_probability'] = target_probs
    
    print(f"  Target probabilities added for {len(df_receivers):,} receiver rows")
    print(f"  Mean target probability: {target_probs.mean():.4f}")
    print(f"  Max target probability: {target_probs.max():.4f}")
    
    # Prepare features for catch prediction (includes future features)
    print("\nPreparing features for catch probability...")
    X_catch = prepare_features_for_prediction(df_receivers, catch_feature_names, catch_label_encoders)
    
    # Predict catch probabilities
    print("  Predicting catch probabilities...")
    catch_probs = catch_model.predict_proba(X_catch)[:, 1]
    df_receivers['catch_probability'] = catch_probs
    
    print(f"  Catch probabilities added for {len(df_receivers):,} receiver rows")
    print(f"  Mean catch probability: {catch_probs.mean():.4f}")
    print(f"  Max catch probability: {catch_probs.max():.4f}")
    
    # Merge predictions back to original dataframe
    print("\nMerging predictions back to full dataframe...")
    # Create a mapping from (game_id, play_id, nfl_id, frame_id) to predictions
    predictions_df = df_receivers[['game_id', 'play_id', 'nfl_id', 'frame_id', 
                                    'target_probability', 'catch_probability']].copy()
    
    # Merge with original dataframe
    df = df.merge(
        predictions_df,
        on=['game_id', 'play_id', 'nfl_id', 'frame_id'],
        how='left'
    )
    
    # Fill NaN for non-receivers
    df['target_probability'] = df['target_probability'].fillna(0.0)
    df['catch_probability'] = df['catch_probability'].fillna(0.0)
    
    print(f"  Predictions merged. Total rows: {len(df):,}")
    print(f"  Rows with target probability: {(df['target_probability'] > 0).sum():,}")
    print(f"  Rows with catch probability: {(df['catch_probability'] > 0).sum():,}")
    
    # Save to CSV (overwrite the input file or save to new file)
    print(f"\nSaving dataframe with predictions to {output_file}...")
    df.to_csv(output_file, index=False)
    
    print("\n" + "="*60)
    print("Summary Statistics")
    print("="*60)
    receiver_mask = (
        (df['player_side'] == 'Offense') & 
        (df['player_position'].isin(['WR', 'TE', 'RB']))
    )
    receivers_with_preds = df[receiver_mask]
    
    print(f"Receiver rows with predictions: {len(receivers_with_preds):,}")
    print(f"\nTarget Probability Statistics:")
    print(f"  Mean: {receivers_with_preds['target_probability'].mean():.4f}")
    print(f"  Median: {receivers_with_preds['target_probability'].median():.4f}")
    print(f"  Min: {receivers_with_preds['target_probability'].min():.4f}")
    print(f"  Max: {receivers_with_preds['target_probability'].max():.4f}")
    print(f"  Std: {receivers_with_preds['target_probability'].std():.4f}")
    
    print(f"\nCatch Probability Statistics:")
    print(f"  Mean: {receivers_with_preds['catch_probability'].mean():.4f}")
    print(f"  Median: {receivers_with_preds['catch_probability'].median():.4f}")
    print(f"  Min: {receivers_with_preds['catch_probability'].min():.4f}")
    print(f"  Max: {receivers_with_preds['catch_probability'].max():.4f}")
    print(f"  Std: {receivers_with_preds['catch_probability'].std():.4f}")
    
    print("\n" + "="*60)
    print(f"Successfully saved dataframe with predictions to {output_file}")
    print("="*60)

if __name__ == '__main__':
    add_predictions_to_dataframe()

