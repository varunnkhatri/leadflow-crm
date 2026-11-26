"use client";
import {useEffect,useState} from "react";
type Scores={accuracy:number;precision:number;recall:number;f1:number;roc_auc:number;confusion_matrix:number[][]};
type Metrics={provenance:string;rows:number;test_rows:number;models:Record<string,Scores>;segmentation:{clusters:number;silhouette:number|null}};
export default function Page(){
 const [m,setM]=useState<Metrics|null>(null),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/ml/metrics").then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setM(d)}).catch(e=>setError(e.message));},[]);
 return <main className="mx-auto max-w-5xl space-y-6 p-8"><h1 className="text-3xl font-bold">Model evaluation</h1><a href="/ml-lab">Back to ML Lab</a>{error&&<p role="alert">{error}</p>}{!m&&!error&&<p>Loading metrics…</p>}{m&&<><p>{m.provenance} · {m.rows} records · {m.test_rows} held-out records</p><div className="grid gap-4 md:grid-cols-2">{Object.entries(m.models).map(([name,s])=><section key={name} className="space-y-3 rounded border p-5"><h2 className="text-xl font-bold">{name.replaceAll("_"," ")}</h2>{(["accuracy","precision","recall","f1","roc_auc"] as const).map(k=><div key={k}><p>{k}: {(s[k]*100).toFixed(1)}%</p><progress className="w-full" value={s[k]} max={1}/></div>)}<h3>Confusion matrix (actual rows, predicted columns)</h3><table><tbody>{s.confusion_matrix.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} className="border p-4">{v}</td>)}</tr>)}</tbody></table></section>)}</div><section className="rounded border p-5"><h2>K-Means clustering</h2><p>Clusters: {m.segmentation.clusters}</p><p>Silhouette: {m.segmentation.silhouette?.toFixed(3)??"Unavailable"}</p></section></>}</main>;
}
