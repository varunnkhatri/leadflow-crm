"""Generate synthetic demonstration data, not real customer observations."""
import numpy as np
import pandas as pd
from pathlib import Path
rng=np.random.default_rng(42)
n=1500
source=rng.choice(["public_form","manual","referral","social"],n)
product=rng.choice(["website","marketing","consulting"],n)
length=rng.integers(10,500,n)
logit=-2+0.006*length+0.8*(source=="referral")+0.4*(product=="website")
p=1/(1+np.exp(-logit))
df=pd.DataFrame({"source":source,"product_interest":product,"enquiry_length":length,"converted":rng.binomial(1,p)})
path=Path(__file__).parent/"demo_leads.csv"
df.to_csv(path,index=False)
print(path)
