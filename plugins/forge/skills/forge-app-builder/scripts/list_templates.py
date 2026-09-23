#!/usr/bin/env python3
"""
List all available Forge templates.

Fetches the official template list from Atlassian's template registry.
Includes 154 templates across all Atlassian products.

Source: https://forge-templates.us-west-2.prod.public.atl-paas.net/templates.json
Last verified: February 2025
"""

import json
import sys
import urllib.request
from typing import List, Dict, Optional

TEMPLATE_REGISTRY_URL = "https://forge-templates.us-west-2.prod.public.atl-paas.net/templates.json"

def fetch_templates() -> List[Dict]:
    """Fetch the latest template list from Atlassian's registry"""
    try:
        with urllib.request.urlopen(TEMPLATE_REGISTRY_URL, timeout=10) as response:
            data = response.read()
            templates = json.loads(data)
            return templates
    except Exception as e:
        print(f"No Failed to fetch templates: {e}", file=sys.stderr)
        print(f"   URL: {TEMPLATE_REGISTRY_URL}", file=sys.stderr)
        sys.exit(1)

def categorize_templates(templates: List[Dict]) -> Dict[str, List[str]]:
    """Categorize templates by product"""
    categories = {
        'Jira': [],
        'Jira Service Management': [],
        'Confluence': [],
        'Bitbucket': [],
        'Compass': [],
        'Rovo': [],
        'Automation': [],
        'Dashboards': [],
        'Teamwork Graph': [],
        'Other': []
    }
    
    for template in templates:
        name = template['name']
        
        if name.startswith('jira-service-management-'):
            categories['Jira Service Management'].append(name)
        elif name.startswith('jira-'):
            categories['Jira'].append(name)
        elif name.startswith('confluence-'):
            categories['Confluence'].append(name)
        elif name.startswith('bitbucket-'):
            categories['Bitbucket'].append(name)
        elif name.startswith('compass-'):
            categories['Compass'].append(name)
        elif 'rovo' in name.lower():
            categories['Rovo'].append(name)
        elif name.startswith('automation-'):
            categories['Automation'].append(name)
        elif name.startswith('dashboards-'):
            categories['Dashboards'].append(name)
        elif name.startswith('teamwork-graph-'):
            categories['Teamwork Graph'].append(name)
        else:
            categories['Other'].append(name)
    
    # Remove empty categories
    return {k: sorted(v) for k, v in categories.items() if v}

def validate_template(template_name: str, templates: List[Dict]) -> bool:
    """
    Validate if a template exists in the official registry.
    Returns True if valid, False otherwise.
    """
    template_names = [t['name'] for t in templates]
    
    print(f"Validating template: {template_name}...", end=" ", flush=True)
    
    if template_name in template_names:
        print("Yes Valid")
        return True
    else:
        print("No Invalid")
        print(f"\nTemplate '{template_name}' not found in the registry.")
        print("\nDid you mean one of these?")
        
        # Find similar templates
        similar = []
        for name in template_names:
            if template_name.lower() in name.lower() or name.lower() in template_name.lower():
                similar.append(name)
        
        if similar:
            for s in sorted(similar)[:10]:
                print(f"  - {s}")
        else:
            # Show templates from the same product
            if '-' in template_name:
                product = template_name.split('-')[0]
                product_templates = [n for n in template_names if n.startswith(f"{product}-")]
                if product_templates:
                    print(f"\nAvailable {product} templates:")
                    for t in sorted(product_templates)[:10]:
                        print(f"  - {t}")
        
        return False

def list_templates(format='text') -> str:
    """List all templates in specified format"""
    templates = fetch_templates()
    
    if format == 'json':
        output = {
            "templates": sorted([t['name'] for t in templates]),
            "count": len(templates),
            "source": TEMPLATE_REGISTRY_URL
        }
        return json.dumps(output, indent=2)
    else:
        # Text format
        categories = categorize_templates(templates)
        output = []
        output.append("=" * 80)
        output.append(f"FORGE TEMPLATES ({len(templates)} total)")
        output.append("=" * 80)
        output.append(f"Source: {TEMPLATE_REGISTRY_URL}")
        output.append("")
        
        for category, template_list in categories.items():
            output.append(f"{category.upper()} ({len(template_list)}):")
            for t in template_list:
                # Find description if available
                desc = next((tmpl.get('description', '') for tmpl in templates if tmpl['name'] == t), '')
                if desc:
                    output.append(f"  - {t} - {desc}")
                else:
                    output.append(f"  - {t}")
            output.append("")
        
        return "\n".join(output)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Forge template manager - fetches templates from Atlassian registry',
        epilog=f'Template registry: {TEMPLATE_REGISTRY_URL}'
    )
    parser.add_argument('--list', action='store_true', help='List all templates (default)')
    parser.add_argument('--validate', metavar='TEMPLATE', help='Validate a specific template')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--count', action='store_true', help='Show only the template count')
    
    args = parser.parse_args()
    
    if args.count:
        templates = fetch_templates()
        print(f"{len(templates)} templates available")
        return
    
    if args.validate:
        templates = fetch_templates()
        is_valid = validate_template(args.validate, templates)
        sys.exit(0 if is_valid else 1)
    else:
        format_type = 'json' if args.json else 'text'
        print(list_templates(format=format_type))

if __name__ == '__main__':
    main()
