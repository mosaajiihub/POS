#!/bin/bash

# Business Ideas PDF Generator Script
# Converts Markdown to PDF using multiple methods

echo "🚀 Business Ideas PDF Generator"
echo "================================"

# Check if pandoc is installed
if command -v pandoc &> /dev/null; then
    echo "📄 Converting Markdown to PDF using Pandoc..."
    pandoc "Top-20-Business-Ideas-Kenya-Africa.md" \
        -o "Top-20-Business-Ideas-Kenya-Africa.pdf" \
        --pdf-engine=xelatex \
        --variable geometry:margin=1in \
        --variable fontsize=11pt \
        --variable linestretch=1.2 \
        --toc \
        --toc-depth=2 \
        --number-sections \
        --highlight-style=tango \
        --metadata title="Top 20 Scalable Business Ideas for Kenya & Africa" \
        --metadata author="Market Research Report" \
        --metadata date="November 2025"
    
    if [ $? -eq 0 ]; then
        echo "✅ PDF created successfully: Top-20-Business-Ideas-Kenya-Africa.pdf"
        ls -lh "Top-20-Business-Ideas-Kenya-Africa.pdf"
        exit 0
    fi
fi

# Alternative: Check if markdown-pdf is available
if command -v markdown-pdf &> /dev/null; then
    echo "📄 Converting using markdown-pdf..."
    markdown-pdf "Top-20-Business-Ideas-Kenya-Africa.md"
    
    if [ $? -eq 0 ]; then
        echo "✅ PDF created successfully"
        exit 0
    fi
fi

# If no tools available, provide instructions
echo "⚠️  No PDF conversion tools found."
echo ""
echo "📋 Options to create PDF:"
echo ""
echo "1. 🌐 BROWSER METHOD (Recommended):"
echo "   • Open: business-ideas-africa.html in your browser"
echo "   • Press Ctrl+P"
echo "   • Select 'Save as PDF'"
echo "   • Save as: Top-20-Business-Ideas-Kenya-Africa.pdf"
echo ""
echo "2. 📦 INSTALL PANDOC:"
echo "   sudo apt-get install pandoc texlive-xetex"
echo "   ./generate_pdf.sh"
echo ""
echo "3. 📱 ONLINE CONVERTER:"
echo "   • Upload Top-20-Business-Ideas-Kenya-Africa.md to:"
echo "   • https://www.markdowntopdf.com/"
echo "   • https://pandoc.org/try/"
echo ""
echo "4. 📝 MARKDOWN EDITOR:"
echo "   • Open .md file in Typora, Mark Text, or VS Code"
echo "   • Use built-in PDF export"

echo ""
echo "📁 Files created:"
echo "   📄 business-ideas-africa.html (Full detailed version)"
echo "   📝 Top-20-Business-Ideas-Kenya-Africa.md (Clean markdown version)"
echo ""
echo "💡 Both files contain the complete business ideas documentation!"