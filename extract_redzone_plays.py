import pandas as pd
import json
import random
import os
import re

print("Loading data files...")

# Read the CSV files
input_df = pd.read_csv('train/input_2023_w01.csv')
output_df = pd.read_csv('train/output_2023_w01.csv')
supplementary_df = pd.read_csv('supplementary_data.csv', low_memory=False)

print(f"Loaded {len(input_df)} input rows, {len(supplementary_df)} supplementary rows")

# Get unique game_id + play_id combinations from input data (plays we CAN extract)
available_plays = input_df[['game_id', 'play_id']].drop_duplicates()
available_set = set(zip(available_plays['game_id'], available_plays['play_id']))
print(f"Available plays in input data: {len(available_set)}")

# Filter supplementary data for red zone completions
rz_completions = supplementary_df[
    (supplementary_df['yardline_number'] <= 20) &
    (supplementary_df['yardline_side'] == supplementary_df['defensive_team']) &
    (supplementary_df['pass_result'] == 'C')
].copy()
print(f"Red zone completions in supplementary: {len(rz_completions)}")

# Find which red zone completions we can actually extract (exist in input data)
rz_completions['can_extract'] = rz_completions.apply(
    lambda row: (row['game_id'], row['play_id']) in available_set, axis=1
)
extractable_rz = rz_completions[rz_completions['can_extract']]
print(f"Red zone completions we CAN extract: {len(extractable_rz)}")

# Load optimal decision data to filter for plays where QB made optimal decision
print("\nLoading optimal decision data...")
try:
    with open('qb_optimal_decisions_per_play_2023_w01.json', 'r') as f:
        optimal_data = json.load(f)
    
    # Create a set of (game_id, play_id) tuples where is_optimal == True
    optimal_plays_set = set(
        (play['game_id'], play['play_id'])
        for play in optimal_data['plays']
        if play['is_optimal']
    )
    print(f"  Found {len(optimal_plays_set)} plays with optimal decisions")
    
    # Filter extractable_rz to only include optimal decision plays
    extractable_rz['is_optimal'] = extractable_rz.apply(
        lambda row: (row['game_id'], row['play_id']) in optimal_plays_set, axis=1
    )
    optimal_rz = extractable_rz[extractable_rz['is_optimal']]
    print(f"Red zone completions with optimal decisions: {len(optimal_rz)}")
    
    # Use optimal plays for selection
    plays_to_select_from = optimal_rz
    
except FileNotFoundError:
    print("  Warning: qb_optimal_decisions_per_play_2023_w01.json not found.")
    print("  Run analyze_qb_optimal_decisions.py first to generate this file.")
    print("  Proceeding without optimal decision filter...")
    plays_to_select_from = extractable_rz
except Exception as e:
    print(f"  Error loading optimal decision data: {e}")
    print("  Proceeding without optimal decision filter...")
    plays_to_select_from = extractable_rz

# Randomly select 100 (or all if less than 100)
num_to_extract = min(100, len(plays_to_select_from))
selected_plays = plays_to_select_from.sample(n=num_to_extract, random_state=42).reset_index(drop=True)
print(f"Selected {num_to_extract} plays to extract")

# Create qb_plays directory
os.makedirs('qb_plays', exist_ok=True)

# Lists to store manifests
plays_manifest = []
qb_mode_manifest = []

# Function to extract receiver name from play description
def extract_receiver_name(play_description):
    if not play_description or pd.isna(play_description):
        return None
    match = re.search(r'pass (?:short|deep|middle|left|right)?\s*(?:left|right|middle)?\s*to\s+([A-Z]\.[A-Za-z\'-]+)', play_description)
    if match:
        return match.group(1)
    return None

# Extract each selected play
for idx, supp_row in selected_plays.iterrows():
    game_id = int(supp_row['game_id'])
    play_id = int(supp_row['play_id'])
    
    print(f"Extracting play {idx+1}/{num_to_extract}: Game {game_id}, Play {play_id}")
    
    # Filter data for this play
    play_data = input_df[(input_df['game_id'] == game_id) & (input_df['play_id'] == play_id)]
    output_data = output_df[(output_df['game_id'] == game_id) & (output_df['play_id'] == play_id)]
    
    if len(play_data) == 0:
        print(f"  Warning: No data found, skipping...")
        continue
    
    # Get play metadata
    play_direction = play_data['play_direction'].iloc[0]
    absolute_yardline = play_data['absolute_yardline_number'].iloc[0]
    ball_land_x = play_data['ball_land_x'].iloc[0]
    ball_land_y = play_data['ball_land_y'].iloc[0]
    max_frame = int(play_data['frame_id'].max())
    throw_frame = max_frame
    
    # Find QB throw position
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
            frame_data = {
                'frame_id': int(frame_row['frame_id']),
                'x': float(frame_row['x']),
                'y': float(frame_row['y']),
                's': float(frame_row['s']),
                'a': float(frame_row['a']),
                'dir': float(frame_row['dir']),
                'o': float(frame_row['o'])
            }
            
            # Add prediction fields if they exist and are not NaN (for receivers)
            if 'catch_probability' in frame_row.index and pd.notna(frame_row['catch_probability']):
                frame_data['catch_probability'] = float(frame_row['catch_probability'])
            if 'target_probability' in frame_row.index and pd.notna(frame_row['target_probability']):
                frame_data['target_probability'] = float(frame_row['target_probability'])
            if 'yards_if_caught' in frame_row.index and pd.notna(frame_row['yards_if_caught']):
                frame_data['yards_if_caught'] = float(frame_row['yards_if_caught'])
            if 'expected_yards' in frame_row.index and pd.notna(frame_row['expected_yards']):
                frame_data['expected_yards'] = float(frame_row['expected_yards'])
            
            frames.append(frame_data)
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
    
    # Save to JSON file in qb_plays folder
    filename = f'qb_plays/play_{game_id}_{play_id}.json'
    with open(filename, 'w') as f:
        json.dump(output, f, indent=2)
    
    # Add to plays manifest
    plays_manifest.append({
        'game_id': game_id,
        'play_id': play_id,
        'filename': filename
    })
    
    # Add to QB mode manifest with extra info
    receiver_name = extract_receiver_name(supp_row['play_description'])
    yardline = f"{supp_row['yardline_side']} {int(supp_row['yardline_number'])}"
    
    qb_mode_manifest.append({
        'game_id': game_id,
        'play_id': play_id,
        'filename': filename,
        'yardline': yardline,
        'possession_team': str(supp_row['possession_team']),
        'defensive_team': str(supp_row['defensive_team']),
        'targeted_receiver_name_abbr': receiver_name
    })
    
    print(f"  Saved: {yardline} - Target: {receiver_name}")

# Save manifests
with open('qb_plays_manifest.json', 'w') as f:
    json.dump(plays_manifest, f, indent=2)

with open('qb_mode_plays_manifest.json', 'w') as f:
    json.dump(qb_mode_manifest, f, indent=2)

print(f"\n=== Summary ===")
print(f"Extracted {len(plays_manifest)} red zone completion plays")
print(f"Saved to qb_plays/ folder")
print(f"Manifest saved to qb_plays_manifest.json")
print(f"QB Mode manifest saved to qb_mode_plays_manifest.json")

