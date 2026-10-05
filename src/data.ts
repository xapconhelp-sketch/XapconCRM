import type { Invoice } from "./types";

export const initialInvoices: Invoice[] = [
  { id: "i1", invoiceNumber: "INV-4029", clientName: "Oakhaven Retail Plaza", projectCategory: "Commercial Flat Roof", amount: 45200, status: "Paid", company: "Robertson Roofing" },
  { id: "i2", invoiceNumber: "INV-4028", clientName: "Sarah Jenkins", projectCategory: "Residential Asphalt", amount: 12450, status: "Overdue", company: "Jenkins Contractors" },
  { id: "i3", invoiceNumber: "INV-4027", clientName: "Westside Industrial", projectCategory: "Metal Roof Repair", amount: 8900, status: "Pending", company: "Robertson Roofing" },
  { id: "i4", invoiceNumber: "INV-4026", clientName: "Pine Crest HOA", projectCategory: "Multi-Family Shingle", amount: 112000, status: "Pending", company: "Jenkins Contractors" },
];
