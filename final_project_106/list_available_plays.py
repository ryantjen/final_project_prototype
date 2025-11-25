import pandas as pd
import json

# Read the input CSV to get all unique game_id + play_id combinations
input_df = pd.read_csv('train/input_2023_w01.csv')

# Get unique combinations of game_id and play_id
available_plays = input_df[['game_id', 'play_id']].drop_duplicates().sort_values(['game_id', 'play_id'])

# Convert to list of dictionaries
plays_list = available_plays.to_dict('records')

# Save to JSON
with open('available_plays.json', 'w') as f:
    json.dump(plays_list, f, indent=2)

print(f"Found {len(plays_list)} unique game/play combinations")
print(f"Saved to available_plays.json")

