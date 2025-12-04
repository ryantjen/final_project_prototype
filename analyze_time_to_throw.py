import pandas as pd
import json
import numpy as np

def analyze_time_to_throw(input_file='train/input_2023_w01.csv',
                         optimal_decisions_file='qb_optimal_decisions_per_play_2023_w01.json',
                         output_file='time_to_throw_analysis_2023_w01.json'):
    """
    Analyze time to throw for each quarterback and compare with optimal/non-optimal averages.
    """
    print("="*60)
    print("Time to Throw Analysis - 2023 Week 1")
    print("="*60)
    
    # Constants
    FRAMES_PER_SECOND = 10
    TIME_PER_FRAME = 1.0 / FRAMES_PER_SECOND  # 0.1 seconds per frame
    
    # Load data
    print("\nLoading data...")
    df = pd.read_csv(input_file, low_memory=False)
    print(f"  Total rows: {len(df):,}")
    
    # Get unique plays
    plays = df[['game_id', 'play_id']].drop_duplicates()
    print(f"  Total plays: {len(plays):,}")
    
    # Calculate throw_frame for each play (max frame_id)
    print("\nCalculating throw frames...")
    throw_frames = df.groupby(['game_id', 'play_id'])['frame_id'].max().reset_index()
    throw_frames.columns = ['game_id', 'play_id', 'throw_frame']
    
    # Calculate time to throw: (throw_frame - 1) * 0.1 seconds
    throw_frames['time_to_throw'] = (throw_frames['throw_frame'] - 1) * TIME_PER_FRAME
    
    # Get QB name for each play
    qb_info = df[df['player_role'] == 'Passer'][['game_id', 'play_id', 'player_name']].drop_duplicates()
    throw_frames = throw_frames.merge(qb_info, on=['game_id', 'play_id'], how='left')
    
    print(f"  Calculated time to throw for {len(throw_frames):,} plays")
    
    # Load optimal decisions data
    print("\nLoading optimal decisions data...")
    try:
        with open(optimal_decisions_file, 'r') as f:
            optimal_data = json.load(f)
        
        # Create a set of (game_id, play_id) tuples where is_optimal == True
        optimal_plays_set = set(
            (play['game_id'], play['play_id'])
            for play in optimal_data['plays']
            if play['is_optimal']
        )
        print(f"  Found {len(optimal_plays_set)} optimal decision plays")
        
        # Add is_optimal flag
        throw_frames['is_optimal'] = throw_frames.apply(
            lambda row: (row['game_id'], row['play_id']) in optimal_plays_set, axis=1
        )
        
        # Calculate overall averages
        overall_avg = throw_frames['time_to_throw'].mean()
        optimal_avg = throw_frames[throw_frames['is_optimal']]['time_to_throw'].mean()
        non_optimal_avg = throw_frames[~throw_frames['is_optimal']]['time_to_throw'].mean()
        
        print(f"\nOverall Averages:")
        print(f"  All plays: {overall_avg:.2f}s ({len(throw_frames)} plays)")
        print(f"  Optimal decisions: {optimal_avg:.2f}s ({throw_frames['is_optimal'].sum()} plays)")
        print(f"  Non-optimal decisions: {non_optimal_avg:.2f}s ({len(throw_frames) - throw_frames['is_optimal'].sum()} plays)")
        
    except FileNotFoundError:
        print(f"  Warning: {optimal_decisions_file} not found.")
        print("  Run analyze_qb_optimal_decisions.py first to generate this file.")
        optimal_avg = None
        non_optimal_avg = None
        throw_frames['is_optimal'] = False
    except Exception as e:
        print(f"  Error loading optimal decisions: {e}")
        optimal_avg = None
        non_optimal_avg = None
        throw_frames['is_optimal'] = False
    
    # Calculate per-QB averages
    print("\nCalculating per-QB averages...")
    qb_stats = throw_frames.groupby('player_name').agg({
        'time_to_throw': 'mean',
        'play_id': 'count'
    }).reset_index()
    qb_stats.columns = ['name', 'avg_time_to_throw', 'total_plays']
    qb_stats = qb_stats.sort_values('avg_time_to_throw').reset_index(drop=True)
    
    # Filter QBs with at least 5 plays
    qb_stats_filtered = qb_stats[qb_stats['total_plays'] >= 5].copy()
    
    print(f"  Found {len(qb_stats_filtered)} QBs with 5+ plays")
    
    # Calculate per-QB optimal/non-optimal averages
    qb_optimal_stats = []
    for _, qb_row in qb_stats_filtered.iterrows():
        qb_name = qb_row['name']
        qb_plays = throw_frames[throw_frames['player_name'] == qb_name]
        
        qb_optimal = qb_plays[qb_plays['is_optimal']]['time_to_throw']
        qb_non_optimal = qb_plays[~qb_plays['is_optimal']]['time_to_throw']
        
        qb_optimal_stats.append({
            'name': qb_name,
            'avg_time_to_throw': round(float(qb_row['avg_time_to_throw']), 2),
            'total_plays': int(qb_row['total_plays']),
            'optimal_avg': round(float(qb_optimal.mean()), 2) if len(qb_optimal) > 0 else None,
            'non_optimal_avg': round(float(qb_non_optimal.mean()), 2) if len(qb_non_optimal) > 0 else None,
            'optimal_count': int(len(qb_optimal)),
            'non_optimal_count': int(len(qb_non_optimal))
        })
    
    # Prepare output data
    output_data = {
        'overall_avg_time_to_throw': round(overall_avg, 2),
        'overall_optimal_avg': round(optimal_avg, 2) if optimal_avg is not None else None,
        'overall_non_optimal_avg': round(non_optimal_avg, 2) if non_optimal_avg is not None else None,
        'total_plays': int(len(throw_frames)),
        'optimal_plays': int(throw_frames['is_optimal'].sum()) if optimal_avg is not None else 0,
        'non_optimal_plays': int((~throw_frames['is_optimal']).sum()) if optimal_avg is not None else 0,
        'frames_per_second': FRAMES_PER_SECOND,
        'time_per_frame': TIME_PER_FRAME,
        'quarterbacks': qb_optimal_stats
    }
    
    # Save to JSON
    print(f"\nSaving results to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"  Saved analysis to {output_file}")
    print(f"  Included {len(qb_optimal_stats)} QBs")
    
    print("\n" + "="*60)
    print("Summary:")
    print(f"  Overall Average: {overall_avg:.2f}s")
    if optimal_avg is not None:
        print(f"  Optimal Decisions Average: {optimal_avg:.2f}s")
        print(f"  Non-Optimal Decisions Average: {non_optimal_avg:.2f}s")
        print(f"  Difference: {non_optimal_avg - optimal_avg:+.2f}s")
    print("="*60)
    
    return output_data

if __name__ == '__main__':
    analyze_time_to_throw()

