#!/usr/bin/env python3
"""
Gather repository-level stats for a GitHub owner (user or org).

Usage:
  python sample.py --owner debugfest --token YOUR_GITHUB_TOKEN

Outputs:
 - {output_prefix}_repo_stats.json
 - {output_prefix}_repo_stats.csv

Metrics collected per repo:
 - repo_name
 - full_name
 - visibility (public/private)
 - default_branch
 - forks_count
 - stargazers_count
 - watchers_count
 - open_issues_count
 - pushed_at
 - commits_count (estimate)
 - prs_merged_count (total merged PRs)
 - issues_open_count (issues only)
 - issues_closed_count (issues only)
 - collaborators_count (None if permission denied)
"""
import argparse
import requests
import time
import csv
import json
from urllib.parse import urlparse, parse_qs

GITHUB_API = "https://api.github.com"

def get(session, url, params=None):
    while True:
        resp = session.get(url, params=params)
        if resp.status_code == 202:
            time.sleep(1)
            continue
        if resp.status_code == 403 and resp.headers.get('X-RateLimit-Remaining') == '0':
            reset = int(resp.headers.get('X-RateLimit-Reset', time.time()+60))
            wait = max(reset - time.time(), 1)
            print(f"Rate limited. Sleeping {int(wait)}s...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp

def paginate(session, url, params=None):
    items = []
    resp = get(session, url, params=params)
    if resp.content:
        items.extend(resp.json())
    while 'link' in resp.headers:
        links = resp.headers['link'].split(',')
        next_link = None
        for l in links:
            if 'rel=\"next\"' in l:
                next_link = l[l.find('<')+1:l.find('>')]
                break
        if not next_link:
            break
        resp = get(session, next_link)
        if resp.content:
            items.extend(resp.json())
    return items

def estimate_commit_count(session, owner, repo, branch):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/commits"
    params = {"sha": branch, "per_page": 1}
    resp = get(session, url, params=params)
    if resp.status_code == 204:
        return 0
    if 'link' in resp.headers:
        for part in resp.headers['link'].split(','):
            if 'rel=\"last\"' in part:
                last_url = part[part.find('<')+1:part.find('>')]
                qs = parse_qs(urlparse(last_url).query)
                last_page = int(qs.get('page', ['1'])[0])
                per_page = int(qs.get('per_page', ['30'])[0])
                last_page_resp = get(session, last_url)
                last_page_items = last_page_resp.json()
                return (last_page - 1) * per_page + len(last_page_items)
    commits = resp.json()
    return len(commits)

def count_prs_merged(session, owner, repo):
    q = f"repo:{owner}/{repo} is:pr is:merged"
    url = f"{GITHUB_API}/search/issues"
    params = {"q": q, "per_page": 1}
    resp = get(session, url, params=params)
    data = resp.json()
    return data.get('total_count', 0)

def count_issues(session, owner, repo):
    q_open = f"repo:{owner}/{repo} is:issue is:open"
    q_closed = f"repo:{owner}/{repo} is:issue is:closed"
    url = f"{GITHUB_API}/search/issues"
    open_count = get(session, url, params={"q": q_open, "per_page": 1}).json().get('total_count', 0)
    closed_count = get(session, url, params={"q": q_closed, "per_page": 1}).json().get('total_count', 0)
    return open_count, closed_count

def count_collaborators(session, owner, repo):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/collaborators"
    try:
        items = paginate(session, url, params={"per_page": 100})
        return len(items)
    except requests.HTTPError:
        return None

def list_repos(session, owner):
    url = f"{GITHUB_API}/users/{owner}/repos"
    repos = paginate(session, url, params={"per_page": 100, "type": "all"})
    return repos

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--owner", required=True)
    p.add_argument("--token", required=True)
    p.add_argument("--output-prefix", default="debugfest")
    args = p.parse_args()

    session = requests.Session()
    session.headers.update({"Authorization": f"token {args.token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "repo-stats-script"})

    print(f"Listing repositories for {args.owner}...")
    repos = list_repos(session, args.owner)
    print(f"Found {len(repos)} repositories.")

    results = []
    for r in repos:
        name = r.get('name')
        full = r.get('full_name')
        print(f"Processing {full} ...")
        default_branch = r.get('default_branch') or 'main'
        try:
            commits_count = estimate_commit_count(session, args.owner, name, default_branch)
        except Exception as e:
            print(f"  Could not estimate commits for {full}: {e}")
            commits_count = None
        try:
            prs_merged = count_prs_merged(session, args.owner, name)
        except Exception as e:
            print(f"  Could not count merged PRs for {full}: {e}")
            prs_merged = None
        try:
            issues_open, issues_closed = count_issues(session, args.owner, name)
        except Exception as e:
            print(f"  Could not count issues for {full}: {e}")
            issues_open, issues_closed = None, None
        collaborators = count_collaborators(session, args.owner, name)

        rec = {
            "repo_name": name,
            "full_name": full,
            "visibility": "private" if r.get('private') else "public",
            "default_branch": default_branch,
            "forks_count": r.get('forks_count'),
            "stargazers_count": r.get('stargazers_count'),
            "watchers_count": r.get('watchers_count'),
            "open_issues_count": r.get('open_issues_count'),
            "pushed_at": r.get('pushed_at'),
            "commits_count": commits_count,
            "prs_merged_count": prs_merged,
            "issues_open_count": issues_open,
            "issues_closed_count": issues_closed,
            "collaborators_count": collaborators
        }
        results.append(rec)

    json_path = f"{args.output_prefix}_repo_stats.json"
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(results, jf, indent=2)
    print(f"Wrote {json_path}")

    csv_path = f"{args.output_prefix}_repo_stats.csv"
    keys = ["repo_name","full_name","visibility","default_branch","forks_count","stargazers_count","watchers_count","open_issues_count","pushed_at","commits_count","prs_merged_count","issues_open_count","issues_closed_count","collaborators_count"]
    with open(csv_path, "w", newline='', encoding="utf-8") as cf:
        writer = csv.DictWriter(cf, fieldnames=keys)
        writer.writeheader()
        for row in results:
            writer.writerow(row)
    print(f"Wrote {csv_path}")

if __name__ == "__main__":
    main()