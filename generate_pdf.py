#!/usr/bin/env python3
"""
PDF Generator for Business Ideas Report
Converts the HTML report to a professional PDF document
"""

import pdfkit
import os
from pathlib import Path

def generate_pdf():
    """Generate PDF from HTML report"""
    
    # File paths
    html_file = "/home/mosaajii/Documents/MH-POS/business-ideas-africa.html"
    pdf_file = "/home/mosaajii/Documents/MH-POS/Top-20-Business-Ideas-Kenya-Africa.pdf"
    
    # PDF options for professional formatting
    options = {
        'page-size': 'A4',
        'margin-top': '0.75in',
        'margin-right': '0.75in',
        'margin-bottom': '0.75in',
        'margin-left': '0.75in',
        'encoding': "UTF-8",
        'no-outline': None,
        'enable-local-file-access': None,
        'print-media-type': None,
        'disable-smart-shrinking': None,
        'page-offset': 0,
        'footer-center': 'Page [page] of [topage]',
        'footer-font-size': '9',
        'footer-spacing': 5,
        'header-center': 'Top 20 Scalable Business Ideas for Kenya & Africa',
        'header-font-size': '9',
        'header-spacing': 5,
        'minimum-font-size': '12'
    }
    
    try:
        # Check if HTML file exists
        if not os.path.exists(html_file):
            print(f"Error: HTML file not found at {html_file}")
            return False
            
        print("Converting HTML to PDF...")
        print(f"Input: {html_file}")
        print(f"Output: {pdf_file}")
        
        # Convert HTML to PDF
        pdfkit.from_file(html_file, pdf_file, options=options)
        
        print(f"✅ PDF successfully created: {pdf_file}")
        
        # Check file size
        file_size = os.path.getsize(pdf_file)
        print(f"📄 File size: {file_size / 1024 / 1024:.2f} MB")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating PDF: {str(e)}")
        print("\n💡 Note: This script requires wkhtmltopdf to be installed.")
        print("Install it with: sudo apt-get install wkhtmltopdf")
        return False

def install_requirements():
    """Install required Python packages"""
    try:
        import pdfkit
        print("✅ pdfkit is already installed")
    except ImportError:
        print("📦 Installing pdfkit...")
        os.system("pip install pdfkit")

if __name__ == "__main__":
    print("🚀 Business Ideas PDF Generator")
    print("=" * 50)
    
    # Install requirements if needed
    install_requirements()
    
    # Generate PDF
    success = generate_pdf()
    
    if success:
        print("\n🎉 PDF generation completed successfully!")
        print("📁 You can find your PDF in the MH-POS directory")
    else:
        print("\n⚠️  PDF generation failed. Please check the error messages above.")