import os
import json
import argparse
import markdown
import frontmatter
from datetime import datetime

# Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT_DIR, 'posts')
MANIFEST_PATH = os.path.join(POSTS_DIR, 'posts.json')
TEMPLATE_PATH = os.path.join(POSTS_DIR, 'template.html')

def publish_post(md_file_path):
    # 1. Parse the Markdown file
    with open(md_file_path, 'r', encoding='utf-8') as f:
        post = frontmatter.load(f)
    
    title = post.get('title', 'Untitled Post')
    date = post.get('date', datetime.now().strftime('%Y-%m-%d'))
    summary = post.get('summary', '')
    slug = post.get('slug', title.lower().replace(' ', '-'))
    
    # Clean slug
    slug = "".join([c for c in slug if c.isalnum() or c == '-']).strip()
    
    # 2. Convert Markdown to HTML
    content_html = markdown.markdown(post.content)
    
    # 3. Read template and inject content
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template = f.read()
    
    final_html = template.replace('{{ title }}', title)
    final_html = final_html.replace('{{ date }}', date)
    final_html = final_html.replace('{{ content }}', content_html)
    
    # 4. Create post directory
    target_dir = os.path.join(POSTS_DIR, slug)
    os.makedirs(target_dir, exist_ok=True)
    
    target_index = os.path.join(target_dir, 'index.html')
    with open(target_index, 'w', encoding='utf-8') as f:
        f.write(final_html)
    
    print(f"Post HTML generated at: {target_index}")
    
    # 5. Update Manifest
    new_entry = {
        "title": title,
        "date": date,
        "path": f"posts/{slug}/",
        "summary": summary
    }
    
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    else:
        manifest = []
    
    # Check if entry already exists (by path) and update or append
    exists = False
    for i, entry in enumerate(manifest):
        if entry['path'] == new_entry['path']:
            manifest[i] = new_entry
            exists = True
            break
    
    if not exists:
        manifest.insert(0, new_entry)
    
    # Sort manifest by date descending
    manifest.sort(key=lambda x: x['date'], reverse=True)
    
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"Manifest updated at: {MANIFEST_PATH}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Publish a Markdown post to the blog.')
    parser.add_argument('file', help='Path to the .md file')
    args = parser.parse_args()
    
    if not os.path.exists(args.file):
        print(f"Error: File {args.file} not found.")
    else:
        publish_post(args.file)
