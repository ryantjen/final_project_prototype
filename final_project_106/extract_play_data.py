import pandas as pd
import json

# Read the CSV files
input_df = pd.read_csv('train/input_2023_w01.csv')
output_df = pd.read_csv('train/output_2023_w01.csv')
supplementary_df = pd.read_csv('supplementary_data.csv')

# Filter for game_id 2023090700 and play_id 101
play_data = input_df[(input_df['game_id'] == 2023090700) & (input_df['play_id'] == 101)]
output_data = output_df[(output_df['game_id'] == 2023090700) & (output_df['play_id'] == 101)]
supplementary_data = supplementary_df[(supplementary_df['game_id'] == 2023090700) & (supplementary_df['play_id'] == 101)]

# Get play metadata
play_direction = play_data['play_direction'].iloc[0]
absolute_yardline = play_data['absolute_yardline_number'].iloc[0]
ball_land_x = play_data['ball_land_x'].iloc[0]
ball_land_y = play_data['ball_land_y'].iloc[0]
max_frame = int(play_data['frame_id'].max())

# The throw happens at the last frame of input data (boundary between input and output)
# Input data is "before the pass is thrown", output data is "after the pass is thrown"
throw_frame = max_frame

# Find QB (quarterback) to determine throw point at the throw_frame
qb_data = play_data[play_data['player_position'] == 'QB']
if len(qb_data) > 0:
    # Get QB position at the throw_frame
    qb_at_throw = qb_data[qb_data['frame_id'] == throw_frame]
    if len(qb_at_throw) > 0:
        qb_row = qb_at_throw.iloc[0]
        ball_throw_x = float(qb_row['x'])
        ball_throw_y = float(qb_row['y'])
    else:
        # If QB not at exact frame, get closest frame
        qb_frames = qb_data['frame_id'].unique()
        closest_frame = min(qb_frames, key=lambda x: abs(x - throw_frame))
        qb_row = qb_data[qb_data['frame_id'] == closest_frame].iloc[0]
        ball_throw_x = float(qb_row['x'])
        ball_throw_y = float(qb_row['y'])
else:
    # Fallback: use first offensive player at throw_frame
    offense_players = play_data[play_data['player_side'] == 'Offense']
    if len(offense_players) > 0:
        offense_at_throw = offense_players[offense_players['frame_id'] == throw_frame]
        if len(offense_at_throw) > 0:
            offense_row = offense_at_throw.iloc[0]
            ball_throw_x = float(offense_row['x'])
            ball_throw_y = float(offense_row['y'])
        else:
            # Use average position at throw_frame
            frame_data = play_data[play_data['frame_id'] == throw_frame]
            ball_throw_x = float(frame_data['x'].mean())
            ball_throw_y = float(frame_data['y'].mean())
    else:
        # Last resort: use average of positions at throw_frame
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
    for _, row in player_frames.iterrows():
        frames.append({
            'frame_id': int(row['frame_id']),
            'x': float(row['x']),
            'y': float(row['y']),
            's': float(row['s']),  # speed
            'a': float(row['a']),  # acceleration
            'dir': float(row['dir']),  # direction
            'o': float(row['o'])  # orientation
        })
        # Get num_frames_output from first row (same for all frames of a player)
        if num_frames_output is None and pd.notna(row['num_frames_output']):
            num_frames_output = int(row['num_frames_output'])
    
    players_data[str(nfl_id)] = {
        'name': player_name,
        'position': player_position,
        'side': player_side,
        'frames': frames,
        'num_frames_output': num_frames_output
    }

# Process output data (player positions after throw)
output_players_data = {}
if len(output_data) > 0:
    for nfl_id in output_data['nfl_id'].unique():
        player_output_frames = output_data[output_data['nfl_id'] == nfl_id].sort_values('frame_id')
        
        output_frames = []
        for _, row in player_output_frames.iterrows():
            output_frames.append({
                'frame_id': int(row['frame_id']),
                'x': float(row['x']),
                'y': float(row['y'])
            })
        
        output_players_data[str(nfl_id)] = {
            'frames': output_frames
        }

# Extract supplementary data
supplementary_info = {}
if len(supplementary_data) > 0:
    row = supplementary_data.iloc[0]
    supplementary_info = {
        'season': int(row['season']) if pd.notna(row['season']) else None,
        'week': int(row['week']) if pd.notna(row['week']) else None,
        'game_date': str(row['game_date']) if pd.notna(row['game_date']) else None,
        'game_time_eastern': str(row['game_time_eastern']) if pd.notna(row['game_time_eastern']) else None,
        'home_team_abbr': str(row['home_team_abbr']) if pd.notna(row['home_team_abbr']) else None,
        'visitor_team_abbr': str(row['visitor_team_abbr']) if pd.notna(row['visitor_team_abbr']) else None,
        'play_description': str(row['play_description']) if pd.notna(row['play_description']) else None,
        'quarter': int(row['quarter']) if pd.notna(row['quarter']) else None,
        'game_clock': str(row['game_clock']) if pd.notna(row['game_clock']) else None,
        'down': int(row['down']) if pd.notna(row['down']) else None,
        'yards_to_go': int(row['yards_to_go']) if pd.notna(row['yards_to_go']) else None,
        'possession_team': str(row['possession_team']) if pd.notna(row['possession_team']) else None,
        'defensive_team': str(row['defensive_team']) if pd.notna(row['defensive_team']) else None,
        'yardline_side': str(row['yardline_side']) if pd.notna(row['yardline_side']) else None,
        'yardline_number': int(row['yardline_number']) if pd.notna(row['yardline_number']) else None,
        'pre_snap_home_score': int(row['pre_snap_home_score']) if pd.notna(row['pre_snap_home_score']) else None,
        'pre_snap_visitor_score': int(row['pre_snap_visitor_score']) if pd.notna(row['pre_snap_visitor_score']) else None,
        'pass_result': str(row['pass_result']) if pd.notna(row['pass_result']) else None,
        'pass_length': float(row['pass_length']) if pd.notna(row['pass_length']) else None,
        'offense_formation': str(row['offense_formation']) if pd.notna(row['offense_formation']) else None,
        'receiver_alignment': str(row['receiver_alignment']) if pd.notna(row['receiver_alignment']) else None,
        'route_of_targeted_receiver': str(row['route_of_targeted_receiver']) if pd.notna(row['route_of_targeted_receiver']) else None,
        'play_action': bool(row['play_action']) if pd.notna(row['play_action']) else None,
        'dropback_type': str(row['dropback_type']) if pd.notna(row['dropback_type']) else None,
        'dropback_distance': float(row['dropback_distance']) if pd.notna(row['dropback_distance']) else None,
        'pass_location_type': str(row['pass_location_type']) if pd.notna(row['pass_location_type']) else None,
        'defenders_in_the_box': int(row['defenders_in_the_box']) if pd.notna(row['defenders_in_the_box']) else None,
        'team_coverage_man_zone': str(row['team_coverage_man_zone']) if pd.notna(row['team_coverage_man_zone']) else None,
        'team_coverage_type': str(row['team_coverage_type']) if pd.notna(row['team_coverage_type']) else None,
        'yards_gained': int(row['yards_gained']) if pd.notna(row['yards_gained']) else None,
        'expected_points': float(row['expected_points']) if pd.notna(row['expected_points']) else None,
        'expected_points_added': float(row['expected_points_added']) if pd.notna(row['expected_points_added']) else None
    }

# Create output structure
output = {
    'game_id': 2023090700,
    'play_id': 101,
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

# Save to JSON
with open('play_data.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"Extracted data for {len(players_data)} players across {output['max_frame']} frames")
print(f"Play direction: {play_direction}")
print(f"Ball throw position: ({ball_throw_x}, {ball_throw_y}) at frame {throw_frame}")
print(f"Ball landing position: ({ball_land_x}, {ball_land_y})")

