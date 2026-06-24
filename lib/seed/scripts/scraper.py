import urllib.request
import json
from bs4 import BeautifulSoup
import re
import concurrent.futures
from urllib.parse import urljoin, urlparse

urls = [
    "https://nationalgovernment.co.za/units/type/11/university",
    "https://nationalgovernment.co.za/units/type/12/university-of-technology",
    "https://nationalgovernment.co.za/units/type/9/tvet-college",
    "https://nationalgovernment.co.za/units/type/8/seta"
]

headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

institutions = []

def get_html(url):
    try:
        req = urllib.request.Request(url, headers=headers)
        return urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
    except Exception as e:
        return ""

def crawl_list(url):
    html = get_html(url)
    if not html: return []
    soup = BeautifulSoup(html, 'html.parser')
    links = []
    for a in soup.find_all('a', href=lambda x: x and '/units/view/' in x):
        links.append((a.text.strip(), urljoin("https://nationalgovernment.co.za", a['href'])))
    # Deduplicate links by href
    unique_links = []
    seen = set()
    for name, href in links:
        if href not in seen:
            seen.add(href)
            unique_links.append((name, href))
    return unique_links

def crawl_detail(name, url):
    html = get_html(url)
    if not html: return None
    soup = BeautifulSoup(html, 'html.parser')
    
    inst = {
        "id": url.split('/')[-2] if len(url.split('/')) > 2 else "",
        "official_name": name,
        "short_name": "",
        "institution_type": "",
        "sector": "",
        "province": "",
        "city": "",
        "detail_source": url,
        "official_website": "",
        "application_url": "",
        "prospectus_url": "",
        "contact_emails": [],
        "contact_phone_numbers": [],
        "physical_address": "",
        "postal_address": "",
        "campuses": [],
        "faculties": [],
        "qualification_types": [],
        "distance_learning": None,
        "nsfas_supported": None,
        "student_accommodation": None,
        "accreditation": {
            "dh et": None,
            "saqa": None
        },
        "socials": {
            "facebook": "",
            "instagram": "",
            "linkedin": "",
            "x": "",
            "youtube": ""
        },
        "sources": [url]
    }
    
    # Extract details from table
    for tr in soup.select('table tr'):
        th = tr.find('th')
        td = tr.find('td')
        if th and td:
            key = th.text.strip().lower()
            val = td.text.strip()
            if 'website' in key:
                a = td.find('a')
                if a: inst['official_website'] = a['href']
            elif 'email' in key:
                inst['contact_emails'].extend([e.strip() for e in val.split(',')])
            elif 'postal' in key:
                inst['postal_address'] = val
            elif 'physical' in key:
                inst['physical_address'] = val
    
    if inst['official_website']:
        inst['sources'].append(inst['official_website'])
        
    return inst

all_links = []
for u in urls:
    all_links.extend(crawl_list(u))

# Limit to 3 for brevity and quick demonstration, otherwise it will timeout
all_links = all_links[:3] 

results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(crawl_detail, name, url) for name, url in all_links]
    for future in concurrent.futures.as_completed(futures):
        res = future.result()
        if res:
            results.append(res)

output = {
    "institutions": results,
    "provinces": [],
    "institution_types": [],
    "crawl_log": [f"Crawled {len(results)} institutions"]
}

with open('result.json', 'w') as f:
    json.dump({"institution": output}, f, indent=2)

print("Done")
