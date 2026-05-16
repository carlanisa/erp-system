#!/bin/bash
# ============================================================
# POS → ERP Migration — Setup & Run Script
# Terminal mein run karein: bash setup_and_run.sh
# ============================================================

echo "============================================"
echo "  POS → ERP Migration Setup"
echo "============================================"

cd "$(dirname "$0")"

# 1. Python venv banana
echo ""
echo "📦 Python virtual environment bana raha hoon..."
python3 -m venv venv
source venv/bin/activate

# 2. Dependencies install
echo ""
echo "📥 Dependencies install kar raha hoon..."
pip install -r requirements.txt

# 3. Playwright browsers install
echo ""
echo "🌐 Playwright browser install kar raha hoon..."
playwright install chromium

echo ""
echo "============================================"
echo "  ✅ Setup mukammal!"
echo "============================================"
echo ""
echo "Ab yeh steps follow karein:"
echo ""
echo "  1️⃣  STEP 1 - POS explore karein:"
echo "      python step1_explore_pos.py"
echo ""
echo "  2️⃣  STEP 2 - Data scrape karein:"
echo "      python step2_scrape_data.py"
echo ""
echo "  3️⃣  config.py mein ERP_EMAIL aur ERP_PASSWORD daalen"
echo ""
echo "  4️⃣  STEP 3 - ERP mein import karein:"
echo "      python step3_import_erp.py"
echo ""
echo "  Scraped data yahan milega: ./scraped_data/"
echo ""
