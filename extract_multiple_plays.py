import pandas as pd
import json
import random
import os

# Read the CSV files
input_df = pd.read_csv('train/input_2023_w01.csv')
output_df = pd.read_csv('train/output_2023_w01.csv')
supplementary_df = pd.read_csv('supplementary_data.csv')

# Get unique game_id + play_id combinations
available_plays = input_df[['game_id', 'play_id']].drop_duplicates().sort_values(['game_id', 'play_id'])

# Randomly sample 50 plays (or all if less than 50 available)
num_plays = min(50, len(available_plays))
selected_plays = available_plays.sample(n=num_plays, random_state=42).reset_index(drop=True)

# Create plays directory if it doesn't exist
os.makedirs('plays', exist_ok=True)

# List to store play metadata
plays_manifest = []

# Extract each selected play
for idx, row in selected_plays.iterrows():
    game_id = int(row['game_id'])
    play_id = int(row['play_id'])
    
    print(f"Extracting play {idx+1}/{num_plays}: Game {game_id}, Play {play_id}")
    
    # Filter data for this play
    play_data = input_df[(input_df['game_id'] == game_id) & (input_df['play_id'] == play_id)]
    output_data = output_df[(output_df['game_id'] == game_id) & (output_df['play_id'] == play_id)]
    supplementary_data = supplementary_df[(supplementary_df['game_id'] == game_id) & (supplementary_df['play_id'] == play_id)]
    
    if len(play_data) == 0:
        print(f"  Warning: No data found for game {game_id}, play {play_id}, skipping...")
        continue
    
    # Get play metadata
    play_direction = play_data['play_direction'].iloc[0]
    absolute_yardline = play_data['absolute_yardline_number'].iloc[0]
    ball_land_x = play_data['ball_land_x'].iloc[0]
    ball_land_y = play_data['ball_land_y'].iloc[0]
    max_frame = int(play_data['frame_id'].max())
    
    # The throw happens at the last frame of input data
    throw_frame = max_frame
    
    # Find QB (quarterback) to determine throw point at the throw_frame
    qb_data = play_data[play_data['player_position'] == 'QB']
    if len(qb_data) > 0:
        qb_at_throw = qb_data[qb_data['frame_id'] == throw_frame]
        if len(qb_at_throw) > 0:
            qb_row = qb_at_throw.iloc[0]
            ball_throw_x = float(qb_row['x'])
            ball_throw_y = float(qb_row['y'])
        else:
            qb_frames = qb_data['frame_id'].unique()
            closest_frame = min(qb_frames, key=lambda x: abs(x - throw_frame))
            qb_row = qb_data[qb_data['frame_id'] == closest_frame].iloc[0]
            ball_throw_x = float(qb_row['x'])
            ball_throw_y = float(qb_row['y'])
    else:
        offense_players = play_data[play_data['player_side'] == 'Offense']
        if len(offense_players) > 0:
            offense_at_throw = offense_players[offense_players['frame_id'] == throw_frame]
            if len(offense_at_throw) > 0:
                offense_row = offense_at_throw.iloc[0]
                ball_throw_x = float(offense_row['x'])
                ball_throw_y = float(offense_row['y'])
            else:
                frame_data = play_data[play_data['frame_id'] == throw_frame]
                ball_throw_x = float(frame_data['x'].mean())
                ball_throw_y = float(frame_data['y'].mean())
        else:
            frame_data = play_data[play_data['frame_id'] == throw_frame]
            ball_throw_x = float(frame_data['x'].mean())
            ball_throw_y = float(frame_data['y'].mean())
    
    # Group by player and frame
    players_data = {}
    for nfl_id in play_data['nfl_id'].unique():
        player_frames = play_data[play_data['nfl_id'] == nfl_id].sort_values('frame_id')
        player_name = player_frames['player_name'].iloc[0]
        player_position = player_frames['player_position'].iloc[0]
        player_side = player_frames['player_side'].iloc[0]
        
        frames = []
        num_frames_output = None
        for _, frame_row in player_frames.iterrows():
            frames.append({
                'frame_id': int(frame_row['frame_id']),
                'x': float(frame_row['x']),
                'y': float(frame_row['y']),
                's': float(frame_row['s']),
                'a': float(frame_row['a']),
                'dir': float(frame_row['dir']),
                'o': float(frame_row['o'])
            })
            if num_frames_output is None and pd.notna(frame_row['num_frames_output']):
                num_frames_output = int(frame_row['num_frames_output'])
        
        players_data[str(nfl_id)] = {
            'name': player_name,
            'position': player_position,
            'side': player_side,
            'frames': frames,
            'num_frames_output': num_frames_output
        }
    
    # Process output data
    output_players_data = {}
    if len(output_data) > 0:
        for nfl_id in output_data['nfl_id'].unique():
            player_output_frames = output_data[output_data['nfl_id'] == nfl_id].sort_values('frame_id')
            
            output_frames = []
            for _, output_row in player_output_frames.iterrows():
                output_frames.append({
                    'frame_id': int(output_row['frame_id']),
                    'x': float(output_row['x']),
                    'y': float(output_row['y'])
                })
            
            output_players_data[str(nfl_id)] = {
                'frames': output_frames
            }
    
    # Extract supplementary data
    supplementary_info = {}
    if len(supplementary_data) > 0:
        supp_row = supplementary_data.iloc[0]
        supplementary_info = {
            'season': int(supp_row['season']) if pd.notna(supp_row['season']) else None,
            'week': int(supp_row['week']) if pd.notna(supp_row['week']) else None,
            'game_date': str(supp_row['game_date']) if pd.notna(supp_row['game_date']) else None,
            'game_time_eastern': str(supp_row['game_time_eastern']) if pd.notna(supp_row['game_time_eastern']) else None,
            'home_team_abbr': str(supp_row['home_team_abbr']) if pd.notna(supp_row['home_team_abbr']) else None,
            'visitor_team_abbr': str(supp_row['visitor_team_abbr']) if pd.notna(supp_row['visitor_team_abbr']) else None,
            'play_description': str(supp_row['play_description']) if pd.notna(supp_row['play_description']) else None,
            'quarter': int(supp_row['quarter']) if pd.notna(supp_row['quarter']) else None,
            'game_clock': str(supp_row['game_clock']) if pd.notna(supp_row['game_clock']) else None,
            'down': int(supp_row['down']) if pd.notna(supp_row['down']) else None,
            'yards_to_go': int(supp_row['yards_to_go']) if pd.notna(supp_row['yards_to_go']) else None,
            'possession_team': str(supp_row['possession_team']) if pd.notna(supp_row['possession_team']) else None,
            'defensive_team': str(supp_row['defensive_team']) if pd.notna(supp_row['defensive_team']) else None,
            'yardline_side': str(supp_row['yardline_side']) if pd.notna(supp_row['yardline_side']) else None,
            'yardline_number': int(supp_row['yardline_number']) if pd.notna(supp_row['yardline_number']) else None,
            'pre_snap_home_score': int(supp_row['pre_snap_home_score']) if pd.notna(supp_row['pre_snap_home_score']) else None,
            'pre_snap_visitor_score': int(supp_row['pre_snap_visitor_score']) if pd.notna(supp_row['pre_snap_visitor_score']) else None,
            'pass_result': str(supp_row['pass_result']) if pd.notna(supp_row['pass_result']) else None,
            'pass_length': float(supp_row['pass_length']) if pd.notna(supp_row['pass_length']) else None,
            'offense_formation': str(supp_row['offense_formation']) if pd.notna(supp_row['offense_formation']) else None,
            'receiver_alignment': str(supp_row['receiver_alignment']) if pd.notna(supp_row['receiver_alignment']) else None,
            'route_of_targeted_receiver': str(supp_row['route_of_targeted_receiver']) if pd.notna(supp_row['route_of_targeted_receiver']) else None,
            'play_action': bool(supp_row['play_action']) if pd.notna(supp_row['play_action']) else None,
            'dropback_type': str(supp_row['dropback_type']) if pd.notna(supp_row['dropback_type']) else None,
            'dropback_distance': float(supp_row['dropback_distance']) if pd.notna(supp_row['dropback_distance']) else None,
            'pass_location_type': str(supp_row['pass_location_type']) if pd.notna(supp_row['pass_location_type']) else None,
            'defenders_in_the_box': int(supp_row['defenders_in_the_box']) if pd.notna(supp_row['defenders_in_the_box']) else None,
            'team_coverage_man_zone': str(supp_row['team_coverage_man_zone']) if pd.notna(supp_row['team_coverage_man_zone']) else None,
            'team_coverage_type': str(supp_row['team_coverage_type']) if pd.notna(supp_row['team_coverage_type']) else None,
            'yards_gained': int(supp_row['yards_gained']) if pd.notna(supp_row['yards_gained']) else None,
            'expected_points': float(supp_row['expected_points']) if pd.notna(supp_row['expected_points']) else None,
            'expected_points_added': float(supp_row['expected_points_added']) if pd.notna(supp_row['expected_points_added']) else None
        }
    
    # Create output structure
    output = {
        'game_id': game_id,
        'play_id': play_id,
        'play_direction': play_direction,
        'absolute_yardline': float(absolute_yardline),
        'ball_throw_x': ball_throw_x,
        'ball_throw_y': ball_throw_y,
        'throw_frame': throw_frame,
        'ball_land_x': float(ball_land_x),
        'ball_land_y': float(ball_land_y),
        'max_frame': max_frame,
        'players': players_data,
        'output_players': output_players_data,
        'supplementary': supplementary_info
    }
    
    # Save to JSON file
    filename = f'plays/play_{game_id}_{play_id}.json'
    with open(filename, 'w') as f:
        json.dump(output, f, indent=2)
    
    # Add to manifest
    plays_manifest.append({
        'game_id': game_id,
        'play_id': play_id,
        'filename': filename
    })
    
    print(f"  Saved to {filename}")

# Save manifest
with open('plays_manifest.json', 'w') as f:
    json.dump(plays_manifest, f, indent=2)

print(f"\nExtracted {len(plays_manifest)} plays")
print(f"Manifest saved to plays_manifest.json")

