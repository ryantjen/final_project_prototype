import pandas as pd
import numpy as np
import json

#try to beat the qb's optimal decision percentage + time in the interactive gamemode. 

def analyze_qb_optimal_decisions(input_file='train/input_2023_w01.csv', 
                                output_file='qb_optimal_decisions_2023_w01.json'):
    """
    Analyze how often quarterbacks make the optimal decision (highest expected yards)
    compared to their actual target choice.
    """
    print("="*60)
    print("QB Optimal Decision Analysis - 2023 Week 1")
    print("="*60)
    
    # Load data
    print("\nLoading data...")
    df = pd.read_csv(input_file, low_memory=False)
    print(f"  Total rows: {len(df):,}")
    
    # Filter to receivers only (WR, TE, RB) and QBs
    receiver_positions = ['WR', 'TE', 'RB']
    receivers_df = df[
        (df['player_side'] == 'Offense') & 
        (df['player_position'].isin(receiver_positions))
    ].copy()
    
    qbs_df = df[df['player_role'] == 'Passer'].copy()
    
    print(f"  Receiver rows: {len(receivers_df):,}")
    print(f"  QB rows: {len(qbs_df):,}")
    
    # Get unique plays
    plays = df[['game_id', 'play_id']].drop_duplicates()
    print(f"  Total plays: {len(plays):,}")
    
    # Find throw_frame for each play (max frame_id)
    throw_frames = df.groupby(['game_id', 'play_id'])['frame_id'].max().reset_index()
    throw_frames.columns = ['game_id', 'play_id', 'throw_frame']
    
    # Get QB name for each play
    qb_info = qbs_df[['game_id', 'play_id', 'player_name']].drop_duplicates()
    
    results = []
    
    print("\nAnalyzing plays...")
    for idx, play in plays.iterrows():
        game_id = play['game_id']
        play_id = play['play_id']
        
        # Get throw_frame for this play
        throw_frame_row = throw_frames[
            (throw_frames['game_id'] == game_id) & 
            (throw_frames['play_id'] == play_id)
        ]
        
        if len(throw_frame_row) == 0:
            continue
            
        throw_frame = throw_frame_row['throw_frame'].iloc[0]
        
        # Get QB name
        qb_row = qb_info[
            (qb_info['game_id'] == game_id) & 
            (qb_info['play_id'] == play_id)
        ]
        
        if len(qb_row) == 0:
            continue
            
        qb_name = qb_row['player_name'].iloc[0]
        
        # Get receivers at throw_frame
        receivers_at_throw = receivers_df[
            (receivers_df['game_id'] == game_id) &
            (receivers_df['play_id'] == play_id) &
            (receivers_df['frame_id'] == throw_frame)
        ].copy()
        
        if len(receivers_at_throw) == 0:
            continue
        
        # Find optimal receiver (highest expected_yards)
        optimal_receiver = receivers_at_throw.loc[
            receivers_at_throw['expected_yards'].idxmax()
        ]
        optimal_nfl_id = optimal_receiver['nfl_id']
        
        # Find actual target (player_role == 'Targeted Receiver')
        actual_target = receivers_at_throw[
            receivers_at_throw['player_role'] == 'Targeted Receiver'
        ]
        
        if len(actual_target) == 0:
            continue
            
        actual_nfl_id = actual_target['nfl_id'].iloc[0]
        
        # Check if optimal
        is_optimal = (optimal_nfl_id == actual_nfl_id)
        
        results.append({
            'game_id': game_id,
            'play_id': play_id,
            'qb_name': qb_name,
            'optimal_nfl_id': optimal_nfl_id,
            'actual_nfl_id': actual_nfl_id,
            'is_optimal': is_optimal,
            'optimal_expected_yards': optimal_receiver['expected_yards'],
            'actual_expected_yards': actual_target['expected_yards'].iloc[0] if len(actual_target) > 0 else None
        })
        
        if (idx + 1) % 100 == 0:
            print(f"  Processed {idx + 1}/{len(plays)} plays...")
    
    print(f"\n  Total plays analyzed: {len(results):,}")
    
    # Convert to DataFrame for easier analysis
    results_df = pd.DataFrame(results)
    
    # Calculate overall statistics
    total_plays = len(results_df)
    optimal_plays = results_df['is_optimal'].sum()
    overall_optimal_percentage = (optimal_plays / total_plays * 100) if total_plays > 0 else 0
    
    print(f"\nOverall Statistics:")
    print(f"  Total plays: {total_plays:,}")
    print(f"  Optimal decisions: {optimal_plays:,}")
    print(f"  Optimal percentage: {overall_optimal_percentage:.2f}%")
    
    # Group by QB
    print("\nCalculating QB statistics...")
    qb_stats = results_df.groupby('qb_name').agg({
        'is_optimal': ['sum', 'count'],
        'play_id': 'count'
    }).reset_index()
    
    qb_stats.columns = ['qb_name', 'optimal_decisions', 'total_attempts', 'play_count']
    qb_stats['optimal_percentage'] = (qb_stats['optimal_decisions'] / qb_stats['total_attempts'] * 100).round(2)
    
    # Sort by optimal percentage (descending)
    qb_stats = qb_stats.sort_values('optimal_percentage', ascending=False).reset_index(drop=True)
    qb_stats['rank'] = qb_stats.index + 1
    
    # Filter QBs with at least 5 attempts for meaningful statistics
    qb_stats_filtered = qb_stats[qb_stats['total_attempts'] >= 5].copy()
    
    print(f"\nQB Statistics (min 5 attempts):")
    print(f"  QBs analyzed: {len(qb_stats_filtered)}")
    print(f"\nTop 5 QBs:")
    for idx, row in qb_stats_filtered.head(5).iterrows():
        print(f"  {row['rank']}. {row['qb_name']}: {row['optimal_percentage']:.2f}% ({row['optimal_decisions']}/{row['total_attempts']})")
    
    # Prepare output JSON
    output_data = {
        'overall_optimal_percentage': round(overall_optimal_percentage, 2),
        'total_plays': int(total_plays),
        'optimal_plays': int(optimal_plays),
        'quarterbacks': []
    }
    
    # Add all QBs (with min 5 attempts)
    for idx, row in qb_stats_filtered.iterrows():
        output_data['quarterbacks'].append({
            'name': row['qb_name'],
            'optimal_decisions': int(row['optimal_decisions']),
            'total_attempts': int(row['total_attempts']),
            'optimal_percentage': float(row['optimal_percentage']),
            'rank': int(row['rank'])
        })
    
    # Save to JSON
    print(f"\nSaving results to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"  Saved {len(output_data['quarterbacks'])} QBs to {output_file}")
    
    # Also save per-play results for filtering
    per_play_file = 'qb_optimal_decisions_per_play_2023_w01.json'
    per_play_data = {
        'plays': [
            {
                'game_id': int(row['game_id']),
                'play_id': int(row['play_id']),
                'is_optimal': bool(row['is_optimal'])
            }
            for _, row in results_df.iterrows()
        ]
    }
    
    print(f"\nSaving per-play results to {per_play_file}...")
    with open(per_play_file, 'w') as f:
        json.dump(per_play_data, f, indent=2)
    
    print(f"  Saved {len(per_play_data['plays'])} plays to {per_play_file}")
    
    print("\n" + "="*60)
    print("Analysis Complete!")
    print("="*60)
    
    return output_data

if __name__ == '__main__':
    analyze_qb_optimal_decisions()

