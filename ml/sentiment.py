"""Train sentiment from a labeled text CSV; no customer identifiers required."""
import argparse,json
from pathlib import Path
import pandas as pd
import joblib
from sklearn.pipeline import make_pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report,confusion_matrix
def train(path,provenance):
    df=pd.read_csv(path).dropna(subset=["text","sentiment"])
    df["text"]=df.text.astype(str).str.strip()
    df=df[df.text!=""].drop_duplicates("text")
    if set(df.sentiment)!={"positive","neutral","negative"} or df.sentiment.value_counts().min()<10:
        raise ValueError("Need at least ten unique texts per sentiment")
    a,b,c,d=train_test_split(df.text,df.sentiment,test_size=.3,random_state=42,stratify=df.sentiment)
    model=make_pipeline(TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True),LogisticRegression(max_iter=1000)).fit(a,c)
    pred=model.predict(b)
    root=Path(__file__).parent/"artifacts"
    root.mkdir(exist_ok=True)
    joblib.dump(model,root/"sentiment.joblib")
    result={"provenance":provenance,"rows":len(df),"test_rows":len(b),"report":classification_report(d,pred,output_dict=True,zero_division=0),"labels":["negative","neutral","positive"],"confusion_matrix":confusion_matrix(d,pred,labels=["negative","neutral","positive"]).tolist()}
    (root/"sentiment_metrics.json").write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("csv")
    p.add_argument("--provenance",required=True)
    a=p.parse_args()
    train(a.csv,a.provenance)
