"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InvoicePage() {
  const params = useParams();
  const invoiceId = params.id;
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    
    // Use the proxy if available or the direct TALKAR endpoint
    const talkarApi = "/api/talkar";
    
    fetch(`${talkarApi}/invoices/${invoiceId}`)
      .then(res => res.json())
      .then(data => {
        setInvoice(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-muted-foreground font-medium">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice || invoice.detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="bg-white dark:bg-zinc-900 border border-border p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Invoice Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the requested invoice. It may have been deleted or the link is invalid.</p>
          <Link href="/wallet">
            <Button className="w-full">Return to Wallet</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const amountRupees = (invoice.amount_paise / 100).toFixed(2);
  const taxAmount = (invoice.amount_paise / 100 * 0.18).toFixed(2); // Mock 18% GST for visual
  const subtotal = (invoice.amount_paise / 100 - parseFloat(taxAmount)).toFixed(2);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans sm:py-12 print:py-0 print:bg-white">
      
      {/* Controls (Hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 px-4 print:hidden flex items-center justify-between">
        <Link href="/wallet" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Wallet
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePrint} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm text-xs font-semibold h-9 px-4">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground text-xs font-bold h-9 px-4 shadow-md">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div id="invoice-container" className="max-w-4xl mx-auto bg-white text-zinc-900 print:shadow-none shadow-xl sm:rounded-xl overflow-hidden print:w-full print:max-w-none print:m-0 print:rounded-none">
        
        {/* Header Ribbon */}
        <div className="h-2 w-full" style={{ backgroundColor: "#fe6905" }} />
        
        <div className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-16">
            <div>
              <div className="flex items-center mb-6">
                <svg version="1.1" viewBox="0 0 300 97.83" className="h-10 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="talkar-k-gradient-invoice" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF5500" />
                      <stop offset="100%" stopColor="#E11D48" />
                    </linearGradient>
                  </defs>
                  <g fill="none" fillRule="nonzero">
                    <path d="M14.08,14.99h14v16.6h17.52c-0.05,4.22 0,8.53 0,12.75h-17.52v10.34c0,2.34-0.08,4.69 0.07,7.03 0.62,9.51 10.2,9.29 17.24,9.29h4.98l-0.38,12.26c-2.84,0.07-5.69,0.1-8.54,0.1-12.14-0.12-23.86-2.47-26.69-16.18-0.8-3.89-0.7-7.46-0.69-11.39v-9.58z" fill="#18181b"/>
                    <path d="M74.54,30.82c6.4-0.64 12.6,1.79 16.87,6.55v-5.74h13.59v50.96h-13.63v-5.17c-0.86,0.84-1.49,1.37-2.43,2.13-7.98,6.05-20.7,4.8-28.13-1.6-16.95-14.61-10.08-45.18 13.72-47.12z" fill="#18181b"/>
                    <path d="M77.07,43.55c7.58-0.76 14.33,4.78 15.06,12.36 0.74,7.58-4.82,14.31-12.4,15.03-7.55,0.71-14.26-4.82-14.99-12.37-0.73-7.55 4.78-14.27 12.33-15.02z" fill="#ffffff"/>
                    <path d="M115.03,14.63h13.59v67.96h-13.59z" fill="#18181b"/>
                    <path d="M133.15,14.92h84.4l-3.66,10.74h-34.26v10.02c6.96-5.5 17.95-3.32 23.08,3.56 7.89,10.59 4.3,24.58-5.5,32.4 4.14,5.82 8.54,11.53 12.67,17.34h-14.65l-11.19-15.45c-1.04-1.45-2.07-2.91-3.07-4.39 6.2-3.77 13.06-8.27 13.44-16.34 0.47-10-12.63-11.39-14.55-2.11-0.56,2.68-0.24,7.79-0.24,10.72v21.11h-12.53c-0.06-4.33 0.03-8.66 0.03-12.99-2.95,2.5-5.68,4.01-9.57,4.52-5.1,0.69-10.27-0.7-14.33-3.86-9.46-7.31-10.16-21.34-3.12-30.54 6.38-8.33 18.46-10.99 27-4.3-0.11-3.15 0-6.55-0.03-9.75h-33.86z" fill="url(#talkar-k-gradient-invoice)"/>
                    <path d="M156.81,43.38c4.1-0.59 7.46,1.4 10.23,4.2 0.62,6.67-1.95,12.94-8.97,14.62-13.19,1.52-13.72-16.59-1.26-18.82z" fill="#ffffff"/>
                    <path d="M233.12,30.81c0.54-0.09 2.43-0.06 3.02-0.02 5.82,0.4 10.2,2.32 14.06,6.65v-5.82h13.49v50.95h-13.5v-5.3c-0.92,0.92-1.52,1.44-2.54,2.25-8.27,5.74-20.21,5.06-27.89-1.41-17.16-14.44-10.55-45.17 13.35-47.3z" fill="#18181b"/>
                    <path d="M235.66,43.54c7.6-0.81 14.41,4.73 15.16,12.34 0.75,7.61-4.83,14.37-12.44,15.07-7.54,0.69-14.22-4.82-14.97-12.35-0.75-7.53 4.72-14.25 12.25-15.05z" fill="#ffffff"/>
                    <path d="M286.19,30.96c1.17-0.18 7-0.05 8.55-0.03l-0.03,12.53c-1.29-0.04-2.58-0.08-3.87-0.1-6.43-0.05-7.18,2.95-7.15,8.77 0.01,2.54 0.01,5.2 0.01,7.75v22.7h-13.43v-24.21c0-6.47-0.83-14.03 2.52-19.79 2.94-5.05 7.83-7.16 13.38-7.62z" fill="#18181b"/>
                  </g>
                </svg>
              </div>
              <div className="text-sm text-zinc-500 leading-relaxed max-w-[250px]">
                <strong className="text-zinc-700">4THORBIT BUSINESS SOLUTIONS PVT LTD</strong><br />
                CIN: U74999JH2022PTC018848<br />
                C/O Bundeshwari Devi, PN Bose Compound<br />
                Lalpur, Ranchi, Jharkhand 834001<br />
                it@4thorbit.in
              </div>
            </div>
            <div className="text-left sm:text-right">
              <h2 className="text-4xl font-extrabold tracking-tight text-zinc-200 mb-2 print:text-zinc-300">INVOICE</h2>
              <p className="text-lg font-bold text-zinc-800">{invoice.invoice_number}</p>
              <div className="mt-4 inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest rounded-full border border-emerald-200/60 print:border-emerald-500">
                {invoice.status}
              </div>
            </div>
          </div>

          {/* Grid Information */}
          <div className="grid sm:grid-cols-2 gap-10 mb-12">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Billed To</h3>
              <p className="text-sm font-bold text-zinc-900">{invoice.customer?.company_name}</p>
              <p className="text-sm text-zinc-600 mt-1">{invoice.customer?.contact_name}</p>
              <p className="text-sm text-zinc-600">{invoice.customer?.contact_email}</p>
            </div>
            <div className="sm:text-right">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Invoice Details</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between sm:justify-end gap-12">
                  <span className="text-zinc-500">Date Issued:</span>
                  <span className="font-semibold text-zinc-900">{new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-12">
                  <span className="text-zinc-500">Total Amount:</span>
                  <span className="font-semibold text-zinc-900">₹{amountRupees}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-12 rounded-xl overflow-hidden border border-zinc-200 print:border-zinc-300">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 print:bg-zinc-100 border-b border-zinc-200">
                <tr>
                  <th className="py-4 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</th>
                  <th className="py-4 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Qty</th>
                  <th className="py-4 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Price</th>
                  <th className="py-4 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr className="bg-white">
                  <td className="py-5 px-5">
                    <p className="font-semibold text-zinc-900">Wallet Top-up</p>
                    <p className="text-xs text-zinc-500 mt-1">Credits added to Talkar platform for voice AI calls.</p>
                  </td>
                  <td className="py-5 px-5 text-right font-medium text-zinc-700">1</td>
                  <td className="py-5 px-5 text-right font-medium text-zinc-700">₹{subtotal}</td>
                  <td className="py-5 px-5 text-right font-bold text-zinc-900">₹{subtotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-16">
            <div className="w-full max-w-xs space-y-3 text-sm">
              <div className="flex justify-between px-2 text-zinc-600">
                <span>Subtotal</span>
                <span className="font-medium">₹{subtotal}</span>
              </div>
              <div className="flex justify-between px-2 text-zinc-600">
                <span>GST (18%)</span>
                <span className="font-medium">₹{taxAmount}</span>
              </div>
              <div className="h-px w-full bg-zinc-200 my-4" />
              <div className="flex justify-between px-2 items-center">
                <span className="text-base font-bold text-zinc-900">Total Paid</span>
                <span className="text-xl font-black" style={{ color: "#fe6905" }}>₹{amountRupees}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
            <p>Thank you for doing business with Talkar.</p>
            <p className="font-medium">talkar.in/terms-of-service</p>
          </div>

        </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          margin: 0; /* Hides the browser header/footer (date, url, title) */
        }
        @media print {
          /* Hide all Next.js layout wrappers and sibling elements */
          body * {
            visibility: hidden;
          }
          /* Force height to auto and remove min-heights to prevent a blank second page */
          *, html, body {
            min-height: 0 !important;
            height: auto !important;
          }
          #invoice-container, #invoice-container * {
            visibility: visible;
          }
          #invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 1cm !important;
          }
          body {
            background-color: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
