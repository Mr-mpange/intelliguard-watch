"""
IntelliGuard Model Training Script
Trains ML models on CICIDS2017 dataset for cyber attack detection
"""

import os
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import classification_report, confusion_matrix
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

warnings.filterwarnings('ignore')

# Configuration
DATA_PATH = "./data"
MODEL_PATH = "./models"
RANDOM_STATE = 42

# Selected features from CICIDS2017 dataset
FEATURE_COLUMNS = [
    'Total Length of Fwd Packets',
    'Flow Duration',
    'Total Fwd Packets',
    'Total Backward Packets',
    'Flow Bytes/s',
    'Flow Packets/s',
    'Fwd IAT Mean',
    'Bwd IAT Mean',
    'Source Port',
    'Destination Port',
    'PSH Flag Count',
    'SYN Flag Count',
    'RST Flag Count',
    'ACK Flag Count',
]

ATTACK_MAPPING = {
    'BENIGN': 'Normal',
    'Bot': 'Bot',
    'DDoS': 'DDoS',
    'DoS GoldenEye': 'DoS GoldenEye',
    'DoS Hulk': 'DoS Hulk',
    'DoS Slowhttptest': 'DoS Slowhttptest',
    'DoS slowloris': 'DoS slowloris',
    'FTP-Patator': 'FTP-Patator',
    'Heartbleed': 'Heartbleed',
    'Infiltration': 'Infiltration',
    'PortScan': 'PortScan',
    'SSH-Patator': 'SSH-Patator',
    'Web Attack – Brute Force': 'Web Attack - Brute Force',
    'Web Attack – Sql Injection': 'Web Attack - Sql Injection',
    'Web Attack – XSS': 'Web Attack - XSS',
}


def load_data():
    """Load and combine all CSV files from CICIDS2017 dataset"""
    print("Loading CICIDS2017 dataset...")
    
    csv_files = [f for f in os.listdir(DATA_PATH) if f.endswith('.csv')]
    
    if not csv_files:
        print(f"No CSV files found in {DATA_PATH}")
        print("\nDownload CICIDS2017 dataset from:")
        print("https://www.unb.ca/cic/datasets/ids-2017.html")
        print(f"\nPlace CSV files in {DATA_PATH}/ directory")
        return None
    
    dfs = []
    for file in csv_files:
        print(f"  Loading {file}...")
        df = pd.read_csv(
            os.path.join(DATA_PATH, file),
            low_memory=False,
            encoding='utf-8'
        )
        dfs.append(df)
    
    data = pd.concat(dfs, ignore_index=True)
    print(f"Total records loaded: {len(data):,}")
    return data


def preprocess_data(df):
    """Clean and preprocess the dataset"""
    print("\nPreprocessing data...")
    
    # Strip column names
    df.columns = df.columns.str.strip()
    
    # Handle missing/infinite values
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna()
    
    # Map attack labels
    df['Label'] = df['Label'].str.strip()
    df['Label'] = df['Label'].map(ATTACK_MAPPING).fillna('Unknown')
    df = df[df['Label'] != 'Unknown']
    
    # Select features
    available_features = [f for f in FEATURE_COLUMNS if f in df.columns]
    
    X = df[available_features].values
    y = df['Label'].values
    
    print(f"Features used: {len(available_features)}")
    print(f"Samples: {len(X):,}")
    print(f"\nClass distribution:")
    for label, count in pd.Series(y).value_counts().items():
        print(f"  {label}: {count:,}")
    
    return X, y, available_features


def train_models(X, y, feature_names):
    """Train all ML models"""
    print("\n" + "="*50)
    print("Training Models")
    print("="*50)
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=RANDOM_STATE, stratify=y_encoded
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Handle class imbalance with SMOTE
    print("\nApplying SMOTE for class balancing...")
    smote = SMOTE(random_state=RANDOM_STATE, k_neighbors=3)
    X_train_balanced, y_train_balanced = smote.fit_resample(X_train_scaled, y_train)
    print(f"Balanced training samples: {len(X_train_balanced):,}")
    
    # ===== Random Forest =====
    print("\n[1/3] Training Random Forest...")
    rf_classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=RANDOM_STATE
    )
    rf_classifier.fit(X_train_balanced, y_train_balanced)
    
    rf_pred = rf_classifier.predict(X_test_scaled)
    print("\nRandom Forest Results:")
    print(classification_report(y_test, rf_pred, target_names=label_encoder.classes_))
    
    # ===== XGBoost =====
    print("\n[2/3] Training XGBoost...")
    xgb_classifier = XGBClassifier(
        n_estimators=100,
        max_depth=10,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='mlogloss',
        n_jobs=-1,
        random_state=RANDOM_STATE
    )
    xgb_classifier.fit(X_train_balanced, y_train_balanced)
    
    xgb_pred = xgb_classifier.predict(X_test_scaled)
    print("\nXGBoost Results:")
    print(classification_report(y_test, xgb_pred, target_names=label_encoder.classes_))
    
    # ===== Isolation Forest (Anomaly Detection) =====
    print("\n[3/3] Training Isolation Forest for Zero-Day Detection...")
    # Train only on normal traffic
    normal_idx = y_train == label_encoder.transform(['Normal'])[0]
    X_normal = X_train_scaled[normal_idx]
    
    isolation_forest = IsolationForest(
        n_estimators=100,
        contamination=0.1,
        max_samples='auto',
        n_jobs=-1,
        random_state=RANDOM_STATE
    )
    isolation_forest.fit(X_normal)
    print("Isolation Forest trained on normal traffic patterns")
    
    # Save models
    os.makedirs(MODEL_PATH, exist_ok=True)
    
    joblib.dump(rf_classifier, f"{MODEL_PATH}/random_forest.pkl")
    joblib.dump(xgb_classifier, f"{MODEL_PATH}/xgboost.pkl")
    joblib.dump(isolation_forest, f"{MODEL_PATH}/isolation_forest.pkl")
    joblib.dump(scaler, f"{MODEL_PATH}/scaler.pkl")
    joblib.dump(label_encoder, f"{MODEL_PATH}/label_encoder.pkl")
    joblib.dump(feature_names, f"{MODEL_PATH}/feature_names.pkl")
    
    print("\n" + "="*50)
    print("✓ All models saved to", MODEL_PATH)
    print("="*50)
    
    return rf_classifier, xgb_classifier, isolation_forest


def main():
    """Main training pipeline"""
    print("="*50)
    print("IntelliGuard Model Training")
    print("CICIDS2017 Dataset")
    print("="*50)
    
    # Create data directory if needed
    os.makedirs(DATA_PATH, exist_ok=True)
    
    # Load data
    df = load_data()
    if df is None:
        return
    
    # Preprocess
    X, y, feature_names = preprocess_data(df)
    
    # Train models
    train_models(X, y, feature_names)
    
    print("\n✓ Training complete!")
    print("Run 'python main.py' to start the API server")


if __name__ == "__main__":
    main()
