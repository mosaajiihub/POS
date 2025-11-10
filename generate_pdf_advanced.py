#!/usr/bin/env python3
"""
Professional PDF Generator for Business Ideas Report
Uses WeasyPrint for HTML to PDF conversion
"""

import os
import sys
from pathlib import Path

def install_weasyprint():
    """Install WeasyPrint if not available"""
    try:
        import weasyprint
        print("✅ WeasyPrint is already installed")
        return True
    except ImportError:
        print("📦 Installing WeasyPrint...")
        try:
            os.system("pip install weasyprint")
            import weasyprint
            print("✅ WeasyPrint installed successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to install WeasyPrint: {e}")
            return False

def generate_pdf_weasyprint():
    """Generate PDF using WeasyPrint"""
    try:
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration
        
        # File paths
        html_file = "/home/mosaajii/Documents/MH-POS/business-ideas-africa.html"
        pdf_file = "/home/mosaajii/Documents/MH-POS/Top-20-Business-Ideas-Kenya-Africa.pdf"
        
        # Check if HTML file exists
        if not os.path.exists(html_file):
            print(f"Error: HTML file not found at {html_file}")
            return False
        
        print("Converting HTML to PDF with WeasyPrint...")
        print(f"Input: {html_file}")
        print(f"Output: {pdf_file}")
        
        # Additional CSS for better PDF formatting
        pdf_css = CSS(string='''
            @page {
                margin: 2cm;
                size: A4;
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10pt;
                    color: #666;
                }
                @top-center {
                    content: "Top 20 Scalable Business Ideas for Kenya & Africa";
                    font-size: 10pt;
                    color: #666;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 5px;
                }
            }
            
            body {
                font-size: 11pt;
                line-height: 1.4;
            }
            
            .business-idea {
                page-break-inside: avoid;
                margin-bottom: 20px;
            }
            
            .tier {
                page-break-before: auto;
            }
            
            .header h1 {
                font-size: 24pt;
            }
            
            h2 {
                font-size: 16pt;
                page-break-after: avoid;
            }
            
            h3 {
                font-size: 14pt;
                page-break-after: avoid;
            }
        ''')
        
        # Convert HTML to PDF
        HTML(filename=html_file).write_pdf(
            pdf_file,
            stylesheets=[pdf_css],
            font_config=FontConfiguration()
        )
        
        print(f"✅ PDF successfully created: {pdf_file}")
        
        # Check file size
        file_size = os.path.getsize(pdf_file)
        print(f"📄 File size: {file_size / 1024 / 1024:.2f} MB")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating PDF with WeasyPrint: {str(e)}")
        return False

def generate_pdf_alternative():
    """Alternative method using reportlab"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from bs4 import BeautifulSoup
        import re
        
        print("Using ReportLab alternative method...")
        
        # File paths
        html_file = "/home/mosaajii/Documents/MH-POS/business-ideas-africa.html"
        pdf_file = "/home/mosaajii/Documents/MH-POS/Top-20-Business-Ideas-Kenya-Africa-Simple.pdf"
        
        # Read HTML content
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Parse HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Create PDF
        doc = SimpleDocTemplate(pdf_file, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            textColor=colors.HexColor('#2c5530'),
            alignment=1  # Center
        )
        
        story.append(Paragraph("Top 20 Scalable Business Ideas for Kenya & Africa", title_style))
        story.append(Spacer(1, 20))
        
        # Extract and format content
        for business_idea in soup.find_all('div', class_='business-idea'):
            # Business title
            title = business_idea.find('h3')
            if title:
                title_text = title.get_text().strip()
                story.append(Paragraph(title_text, styles['Heading2']))
                story.append(Spacer(1, 12))
            
            # Business details
            for detail_row in business_idea.find_all('div', class_='detail-row'):
                label = detail_row.find('div', class_='detail-label')
                content = detail_row.find('div', class_='detail-content')
                
                if label and content:
                    label_text = label.get_text().strip()
                    content_text = content.get_text().strip()
                    
                    story.append(Paragraph(f"<b>{label_text}</b> {content_text}", styles['Normal']))
                    story.append(Spacer(1, 6))
            
            story.append(Spacer(1, 20))
        
        # Build PDF
        doc.build(story)
        
        print(f"✅ Simple PDF created: {pdf_file}")
        return True
        
    except Exception as e:
        print(f"❌ Error with alternative method: {e}")
        return False

def main():
    """Main function to generate PDF"""
    print("🚀 Business Ideas PDF Generator")
    print("=" * 50)
    
    # Try WeasyPrint first
    if install_weasyprint():
        if generate_pdf_weasyprint():
            print("\n🎉 PDF generation completed successfully with WeasyPrint!")
            return
    
    # Try alternative method
    print("\n📝 Trying alternative PDF generation method...")
    try:
        os.system("pip install reportlab beautifulsoup4")
        if generate_pdf_alternative():
            print("\n🎉 PDF generation completed with alternative method!")
            return
    except:
        pass
    
    # Manual instructions if all else fails
    print("\n⚠️  Automatic PDF generation failed.")
    print("\n📋 Manual Instructions:")
    print("1. Open the file: /home/mosaajii/Documents/MH-POS/business-ideas-africa.html")
    print("2. Open it in your web browser (Chrome, Firefox, etc.)")
    print("3. Use Ctrl+P to print")
    print("4. Select 'Save as PDF' as the destination")
    print("5. Save as 'Top-20-Business-Ideas-Kenya-Africa.pdf'")

if __name__ == "__main__":
    main()