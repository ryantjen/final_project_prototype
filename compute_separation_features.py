import pandas as pd
import numpy as np
from pathlib import Path
from scipy.spatial.distance import cdist

def calculate_separation_features_for_play(play_data):
    """
    Calculate separation features for each receiver at each frame in a play.
    Optimized with vectorized operations.
    
    Args:
        play_data: DataFrame containing all players for a single play
        
    Returns:
        DataFrame with separation features added
    """
    # Identify receivers (Offense players, excluding QB)
    # Common receiver positions: WR, TE, RB
    receiver_positions = ['WR', 'TE', 'RB']
    receiver_mask = (
        (play_data['player_side'] == 'Offense') & 
        (play_data['player_position'].isin(receiver_positions))
    )
    receivers = play_data[receiver_mask].copy()
    
    # Identify defenders (Defense players)
    defenders = play_data[play_data['player_side'] == 'Defense'].copy()
    
    # Initialize separation feature columns with NaN
    sep_cols = [
        'nearest_defender_distance', 'nearest_defender_id', 
        'nearest_defender_x', 'nearest_defender_y',
        'separation_x', 'separation_y', 'separation_angle',
        'second_nearest_defender_distance',
        'receiver_speed', 'receiver_acceleration',
        'nearest_defender_speed', 'nearest_defender_acceleration'
    ]
    for col in sep_cols:
        play_data[col] = np.nan
    
    # If no receivers or no defenders, return early
    if len(receivers) == 0 or len(defenders) == 0:
        return play_data
    
    # Process each frame using vectorized operations
    frames = play_data['frame_id'].unique()
    
    for frame_id in frames:
        # Get receivers and defenders at this frame
        rec_frame = receivers[receivers['frame_id'] == frame_id]
        def_frame = defenders[defenders['frame_id'] == frame_id]
        
        if len(rec_frame) == 0 or len(def_frame) == 0:
            continue
        
        # Extract positions as numpy arrays for vectorized computation
        rec_positions = rec_frame[['x', 'y']].values  # Shape: (n_receivers, 2)
        def_positions = def_frame[['x', 'y']].values    # Shape: (n_defenders, 2)
        rec_indices = rec_frame.index.values
        rec_nfl_ids = rec_frame['nfl_id'].values
        
        # Extract receiver speed and acceleration
        rec_speeds = rec_frame['s'].values  # Speed
        rec_accelerations = rec_frame['a'].values  # Acceleration
        
        def_nfl_ids = def_frame['nfl_id'].values
        def_indices = def_frame.index.values
        
        # Extract defender speed and acceleration
        def_speeds = def_frame['s'].values  # Speed
        def_accelerations = def_frame['a'].values  # Acceleration
        
        # Calculate pairwise distances using scipy (much faster than loops)
        # Result shape: (n_receivers, n_defenders)
        distances = cdist(rec_positions, def_positions, metric='euclidean')
        
        # Find nearest and second nearest defenders for each receiver
        # Argsort along defender axis (axis=1) to get sorted indices
        sorted_indices = np.argsort(distances, axis=1)
        
        # Get nearest defender indices and distances
        nearest_idx = sorted_indices[:, 0]
        nearest_distances = distances[np.arange(len(rec_frame)), nearest_idx]
        
        # Get second nearest (if exists)
        second_nearest_distances = np.full(len(rec_frame), np.nan)
        if distances.shape[1] > 1:
            second_nearest_idx = sorted_indices[:, 1]
            second_nearest_distances = distances[np.arange(len(rec_frame)), second_nearest_idx]
        
        # Extract nearest defender information (using numpy array indexing)
        nearest_def_nfl_ids = def_nfl_ids[nearest_idx]
        nearest_def_x = def_positions[nearest_idx, 0]  # x coordinates
        nearest_def_y = def_positions[nearest_idx, 1]  # y coordinates
        nearest_def_speeds = def_speeds[nearest_idx]  # speed
        nearest_def_accelerations = def_accelerations[nearest_idx]  # acceleration
        
        # Calculate separation components (vectorized)
        separation_x = nearest_def_x - rec_positions[:, 0]
        separation_y = nearest_def_y - rec_positions[:, 1]
        
        # Calculate separation angle (vectorized)
        # atan2 returns angle in radians, convert to degrees
        angles_rad = np.arctan2(separation_y, separation_x)
        angles_deg = np.degrees(angles_rad)
        # Normalize to 0-360 range
        angles_deg = np.where(angles_deg < 0, angles_deg + 360, angles_deg)
        
        # Assign values back to dataframe (vectorized assignment)
        play_data.loc[rec_indices, 'nearest_defender_distance'] = nearest_distances
        play_data.loc[rec_indices, 'nearest_defender_id'] = nearest_def_nfl_ids
        play_data.loc[rec_indices, 'nearest_defender_x'] = nearest_def_x
        play_data.loc[rec_indices, 'nearest_defender_y'] = nearest_def_y
        play_data.loc[rec_indices, 'separation_x'] = separation_x
        play_data.loc[rec_indices, 'separation_y'] = separation_y
        play_data.loc[rec_indices, 'separation_angle'] = angles_deg
        play_data.loc[rec_indices, 'second_nearest_defender_distance'] = second_nearest_distances
        
        # Assign receiver speed and acceleration
        play_data.loc[rec_indices, 'receiver_speed'] = rec_speeds
        play_data.loc[rec_indices, 'receiver_acceleration'] = rec_accelerations
        
        # Assign nearest defender speed and acceleration
        play_data.loc[rec_indices, 'nearest_defender_speed'] = nearest_def_speeds
        play_data.loc[rec_indices, 'nearest_defender_acceleration'] = nearest_def_accelerations
    
    return play_data

def process_all_plays(input_dir='train', output_file='train/input_with_separation.csv'):
    """
    Process all input CSV files and add separation features.
    Optimized for performance with efficient grouping and processing.
    
    Args:
        input_dir: Directory containing input CSV files
        output_file: Path to save the merged dataframe with separation features
    """
    print("Loading input CSV files...")
    
    # Find all input CSV files
    input_files = sorted(Path(input_dir).glob('input_2023_w*.csv'))
    
    if len(input_files) == 0:
        print(f"No input files found in {input_dir}")
        return
    
    print(f"Found {len(input_files)} input files")
    
    # Process each file
    all_dataframes = []
    
    for file_idx, input_file in enumerate(input_files, 1):
        print(f"Processing {input_file.name} ({file_idx}/{len(input_files)})...")
        
        # Read the CSV file
        df = pd.read_csv(input_file)
        
        # Get unique plays using more efficient method
        play_keys = df[['game_id', 'play_id']].drop_duplicates()
        num_plays = len(play_keys)
        
        print(f"  Found {num_plays} plays in {input_file.name}")
        
        # Group by play for more efficient processing
        # This avoids repeated filtering
        grouped = df.groupby(['game_id', 'play_id'])
        
        # Process each play
        processed_plays = []
        for play_idx, ((game_id, play_id), play_data) in enumerate(grouped, 1):
            # Calculate separation features
            play_data_with_separation = calculate_separation_features_for_play(play_data.copy())
            processed_plays.append(play_data_with_separation)
            
            # Progress update every 100 plays
            if play_idx % 100 == 0:
                print(f"    Processed {play_idx}/{num_plays} plays...")
        
        # Combine all plays from this file (more efficient than repeated concat)
        if processed_plays:
            file_df = pd.concat(processed_plays, ignore_index=True)
            all_dataframes.append(file_df)
        
        print(f"  Completed {input_file.name}")
    
    # Combine all dataframes
    print("\nCombining all data...")
    merged_df = pd.concat(all_dataframes, ignore_index=True)
    
    # Sort by game_id, play_id, frame_id, nfl_id for consistency
    merged_df = merged_df.sort_values(['game_id', 'play_id', 'frame_id', 'nfl_id']).reset_index(drop=True)
    
    # Save to CSV
    print(f"\nSaving merged dataframe with separation features to {output_file}...")
    merged_df.to_csv(output_file, index=False)
    
    # Print summary statistics
    print("\n" + "="*60)
    print("Summary Statistics")
    print("="*60)
    print(f"Total rows: {len(merged_df):,}")
    print(f"Total plays: {merged_df[['game_id', 'play_id']].drop_duplicates().shape[0]:,}")
    print(f"Total frames: {merged_df[['game_id', 'play_id', 'frame_id']].drop_duplicates().shape[0]:,}")
    
    # Receiver statistics
    receiver_positions = ['WR', 'TE', 'RB']
    receivers_df = merged_df[
        (merged_df['player_side'] == 'Offense') & 
        (merged_df['player_position'].isin(receiver_positions))
    ]
    print(f"\nReceiver rows: {len(receivers_df):,}")
    
    # Separation feature statistics (only for receivers with valid separation)
    valid_separation = receivers_df['nearest_defender_distance'].notna()
    if valid_separation.sum() > 0:
        print(f"Receiver rows with separation data: {valid_separation.sum():,}")
        print(f"\nSeparation Distance Statistics (yards):")
        print(f"  Mean: {receivers_df.loc[valid_separation, 'nearest_defender_distance'].mean():.2f}")
        print(f"  Median: {receivers_df.loc[valid_separation, 'nearest_defender_distance'].median():.2f}")
        print(f"  Min: {receivers_df.loc[valid_separation, 'nearest_defender_distance'].min():.2f}")
        print(f"  Max: {receivers_df.loc[valid_separation, 'nearest_defender_distance'].max():.2f}")
        print(f"  Std: {receivers_df.loc[valid_separation, 'nearest_defender_distance'].std():.2f}")
    
    print("\n" + "="*60)
    print(f"Successfully saved merged dataframe to {output_file}")
    print("="*60)

if __name__ == '__main__':
    # Process all plays
    process_all_plays()

