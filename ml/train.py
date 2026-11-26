"""Train conversion models on a labeled CSV; never use post-outcome features."""
import argparse, json
from pathlib import Path
import pandas as pd
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

FEATURES = ["source", "product_interest", "enquiry_length"]
def train(path, provenance):
    df = pd.read_csv(path)
    if not set(FEATURES + ["converted"]).issubset(df.columns):
        raise ValueError("Required columns: " + ", ".join(FEATURES + ["converted"]))
    y = df.converted
    if set(y.unique()) != {0, 1} or y.value_counts().min() < 10:
        raise ValueError("Need at least 10 labeled examples of each outcome")
    x = df[FEATURES]
    x_train,x_test,y_train,y_test = train_test_split(x,y,test_size=.25,random_state=42,stratify=y)
    out = Path(__file__).parent / "artifacts"
    out.mkdir(exist_ok=True)
    metrics = {"provenance": provenance, "rows":len(df),"test_rows":len(y_test),"models":{}}
    for name, estimator in [("logistic_regression",LogisticRegression(max_iter=1000)),("random_forest",RandomForestClassifier(n_estimators=150,random_state=42,min_samples_leaf=3))]:
        prep = ColumnTransformer([("category",make_pipeline(SimpleImputer(strategy="most_frequent"),OneHotEncoder(handle_unknown="ignore")),FEATURES[:2]),("number",make_pipeline(SimpleImputer(strategy="median"),StandardScaler()),FEATURES[2:])])
        model = make_pipeline(prep,estimator).fit(x_train,y_train)
        pred=model.predict(x_test)
        prob=model.predict_proba(x_test)[:,1]
        metrics["models"][name]={"accuracy":accuracy_score(y_test,pred),"precision":precision_score(y_test,pred,zero_division=0),"recall":recall_score(y_test,pred,zero_division=0),"f1":f1_score(y_test,pred,zero_division=0),"roc_auc":roc_auc_score(y_test,prob),"confusion_matrix":confusion_matrix(y_test,pred).tolist()}
        joblib.dump(model,out/(name+".joblib"))
    prep=ColumnTransformer([("category",OneHotEncoder(handle_unknown="ignore",sparse_output=False),FEATURES[:2]),("number",make_pipeline(SimpleImputer(strategy="median"),StandardScaler()),FEATURES[2:])])
    z=prep.fit_transform(x_train)
    km=KMeans(n_clusters=3,random_state=42,n_init=10).fit(z)
    ztest=prep.transform(x_test)
    labels=km.predict(ztest)
    metrics["segmentation"]={"clusters":3,"silhouette":float(silhouette_score(ztest,labels)) if 1<len(set(labels))<len(labels) else None}
    joblib.dump((prep,km),out/"segments.joblib")
    (out/"metrics.json").write_text(json.dumps(metrics,indent=2))
    print(json.dumps(metrics,indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("csv")
    p.add_argument("--provenance",required=True)
    a=p.parse_args()
    train(a.csv,a.provenance)
