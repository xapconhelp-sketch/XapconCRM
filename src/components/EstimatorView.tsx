import React, { useState, useEffect } from "react";
import { Estimate, EstimateItem, Lead, MaterialItem } from "../types";
import { useAuth } from "../contexts/AuthContext";
import logoXapcon from "../../LogoXapcon.png";
import MaterialsCatalogModal from "./MaterialsCatalogModal";
import globalMaterials from "../data/materials.json";
import { retailDefaults, calculateRetailPricing } from '../lib/retailPricing.js';
import {
  FileSignature,
  Trash2,
  Plus,
  Calculator,
  CheckCircle2,
  FileText,
  Users,
  Search,
  Download,
  Mail,
  X,
  FileCheck2,
  FileSpreadsheet
} from "lucide-react";

const DEFAULT_TERMS_TEXT = "ALL WORK WILL BE COMPLETED IN FULL IN ACCORDANCE WITH THE QUOTE APPROVED BY THE CLIENT. The materials specified in the client’s approved estimate will be used, employing installation methods that comply with current Arkansas building codes, IRC and IBC standards, the manufacturer’s installation guidelines, and industry best practices.";

interface EstimatorViewProps {
  leads: Lead[];
  onUpdateLeadEstimate: (leadId: string, estimate: Estimate) => Promise<void> | void;
  onAddLead: (lead: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => Promise<void> | void;
  onDeleteLead?: (leadId: string) => Promise<void> | void;
}

export default function EstimatorView({
  leads,
  onUpdateLeadEstimate,
  onAddLead,
  onDeleteLead
}: EstimatorViewProps) {
  const { profile, activeOrganization } = useAuth();
  const userRole = profile?.role === 'super_admin' ? 'admin' : 'contractor';
  const pdfPrimaryColor = activeOrganization?.brand_primary_color || "#102A46";
  const pdfAccentColor = activeOrganization?.brand_accent_color || "#8C6A22";
  const pdfUsesOrganizationBranding = userRole === "contractor" || Boolean(activeOrganization);
  const pdfCompanyLogo = activeOrganization?.logo_url || (userRole === "contractor" ? profile?.avatar_url : undefined);
  const pdfCompanyName = activeOrganization?.company_name || activeOrganization?.name || (userRole === "contractor" ? profile?.full_name : "Xapcon Group") || "Roofing Contractor";

  // Master-Detail State
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingLead, setIsAddingLead] = useState(false);

  // New Lead Form State
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadAddress, setNewLeadAddress] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");

  // Edit concepts states
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<"material" | "labor" | "fee">("material");
  const [newQty, setNewQty] = useState("1");
  const [newUnit, setNewUnit] = useState("SQ");
  const [newPrice, setNewPrice] = useState("100");
  const [itemNumericDrafts, setItemNumericDrafts] = useState<Record<string, string>>({});

  // Catalog States
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Feedback for estimate actions.
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Sync selected lead when leads list changes
  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  const selectedLead = leads.find(l => l.id === selectedLeadId) || leads[0];

  // Initialize a default estimate if selected lead doesn't have one
  const activeEstimate: Estimate = selectedLead?.estimate || {
    id: `EST-${selectedLead?.id.slice(0, 5).toUpperCase() || "NEW"}`,
    leadId: selectedLead?.id || "",
    clientName: selectedLead?.name || "",
    address: selectedLead?.address || "",
    clientPhone: selectedLead?.phone || "",
    clientEmail: selectedLead?.email || "",
    status: "Draft",
    items: [],
    subtotalMaterials: 0,
    subtotalLabor: 0,
    ...retailDefaults(activeOrganization),
    profitMargin: 0
  };

  // Helper: Recalculate Estimate
  const recalculate = (items: EstimateItem[], currentEst: Estimate): Estimate => {
    items = items.map(item => ({ ...item, total: item.qty * item.unitPrice }));
    const pricing = calculateRetailPricing(items, currentEst);
    const subGross = pricing.subtotalGross;

    // Calculate realistic cost based on materials and crew labor costs
    let totalCost = 0;
    items.forEach((item) => {
      let costFactor = 0.6; // standard default cost factor (40% profit margin default)
      if (item.description.includes("Shingle") || item.description.includes("Teja")) {
        costFactor = 80 / 120;
      } else if (item.description.includes("Underlayment") || item.description.includes("Membrana")) {
        costFactor = 50 / 85;
      } else if (item.description.includes("Ridge") || item.description.includes("Venting")) {
        costFactor = 8 / 12.5;
      } else if (item.description.includes("Labor") || item.description.includes("Mano")) {
        costFactor = 60 / 95;
      } else if (item.category === "fee") {
        costFactor = 1.0;
      }
      totalCost += item.qty * (item.unitPrice * costFactor);
    });

    const profit = subGross - totalCost;
    const profitMargin = subGross > 0 ? Math.round((profit / subGross) * 100 * 10) / 10 : 0;

    return {
      ...currentEst,
      items,
      ...pricing,
      profitMargin
    };
  };

  // Actions
  const handleUpdateItem = (itemId: string, qty: number, unitPrice: number) => {
    const updatedItems = activeEstimate.items.map((item) =>
      item.id === itemId ? { ...item, qty, unitPrice, total: qty * unitPrice } : item
    );
    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const updateItemNumericDraft = (itemId: string, field: "qty" | "unitPrice", rawValue: string) => {
    if (!/^\d*\.?\d*$/.test(rawValue)) return;
    const draftKey = `${itemId}:${field}`;
    setItemNumericDrafts(current => ({ ...current, [draftKey]: rawValue }));
    if (rawValue === "" || rawValue === ".") return;

    const value = Number(rawValue);
    const item = activeEstimate.items.find(current => current.id === itemId);
    if (!item || !Number.isFinite(value)) return;
    handleUpdateItem(itemId, field === "qty" ? value : item.qty, field === "unitPrice" ? value : item.unitPrice);
  };

  const clearItemNumericDraft = (itemId: string, field: "qty" | "unitPrice") => {
    const draftKey = `${itemId}:${field}`;
    setItemNumericDrafts(current => {
      const next = { ...current };
      delete next[draftKey];
      return next;
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const newItem: EstimateItem = {
      id: `est-custom-${Date.now()}`,
      description: newDesc.trim(),
      category: newCategory,
      qty: Number(newQty) || 1,
      unit: newUnit || "SQ",
      unitPrice: Number(newPrice) || 0,
      total: (Number(newQty) || 1) * (Number(newPrice) || 0)
    };

    const updatedItems = [...activeEstimate.items, newItem];
    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);

    setNewDesc("");
    setIsAddingItem(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = activeEstimate.items.filter((item) => item.id !== itemId);
    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleAutoAdjustMargin = () => {
    const laborItem = activeEstimate.items.find((item) => item.category === "labor");
    if (!laborItem) return;

    let costNonLabor = 0;
    let sellNonLabor = 0;

    activeEstimate.items.forEach((item) => {
      if (item.category !== "labor") {
        let costFactor = 0.6;
        if (item.description.includes("Shingle") || item.description.includes("Teja")) costFactor = 80 / 120;
        else if (item.description.includes("Underlayment") || item.description.includes("Membrana")) costFactor = 50 / 85;
        else if (item.description.includes("Ridge") || item.description.includes("Venting")) costFactor = 8 / 12.5;
        else if (item.category === "fee") costFactor = 1.0;

        costNonLabor += item.qty * (item.unitPrice * costFactor);
        sellNonLabor += item.qty * item.unitPrice;
      }
    });

    const laborCrewCost = laborItem.qty * 60;
    const totalCost = costNonLabor + laborCrewCost;

    const targetGross = totalCost / 0.7;
    const targetLaborSellTotal = targetGross - sellNonLabor;
    const targetLaborUnitPrice = Math.round((targetLaborSellTotal / laborItem.qty) * 10) / 10;

    const updatedItems = activeEstimate.items.map((item) =>
      item.category === "labor"
        ? { ...item, unitPrice: targetLaborUnitPrice, total: item.qty * targetLaborUnitPrice }
        : item
    );

    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleUpdateHomeownerDetails = (field: "clientName" | "address" | "clientPhone" | "clientEmail", value: string) => {
    const updatedEst = { ...activeEstimate, [field]: value };
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleUpdateStatus = (status: "Draft" | "Sent" | "Approved") => {
    const updatedEst = { ...activeEstimate, status };
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleUpdateTermsText = (value: string) => {
    const updatedEst = { ...activeEstimate, termsAndCommitment: value };
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleToggleWarrantyType = (optId: string) => {
    const currentTypes = activeEstimate.warrantyTypes || (activeEstimate.warrantyType ? [activeEstimate.warrantyType] : []);
    let updatedTypes: string[];
    if (currentTypes.includes(optId)) {
      updatedTypes = currentTypes.filter(id => id !== optId);
    } else {
      updatedTypes = [...currentTypes, optId];
    }
    const updatedEst = {
      ...activeEstimate,
      warrantyTypes: updatedTypes,
      warrantyType: undefined
    };
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  // Submit new lead
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;

    await onAddLead({
      name: newLeadName.trim(),
      status: "Nuevo",
      address: newLeadAddress.trim(),
      phone: newLeadPhone.trim(),
      email: newLeadEmail.trim(),
      propertyType: "Residential - Single Family",
      sqft: 2000,
      insuranceProvider: "",
      claimNumber: "",
      adjusterName: "N/A",
      assignedRep: profile?.full_name || "Por asignar",
      assignedRepAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC"
    });

    setNewLeadName("");
    setNewLeadAddress("");
    setNewLeadPhone("");
    setNewLeadEmail("");
    setIsAddingLead(false);

    setToastMessage("¡Nueva cotización retail creada!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Print PDF Trigger
  const handlePrint = () => {
    window.print();
  };

  // Filtering
  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.address && l.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isMarginUnderStandard = activeEstimate.profitMargin < 30;

  return (
    <div className="retail-estimator flex-1 flex h-screen overflow-hidden bg-[#F4F6F8]">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

        @media print {
          /* Reset screen-only styles */
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }

          /* Reset parent structures to prevent shifts, margins, and cut-off content on print */
          body,
          #root,
          main,
          .min-h-screen,
          .flex-1.flex.h-screen.overflow-hidden,
          .flex-1.flex.flex-col.h-screen.overflow-y-auto,
          .flex-1.p-6.space-y-6 {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            position: static !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }

          #print-area {
            position: relative !important;
            width: 100% !important;
            padding: 0px !important;
            margin: 0px !important;
            background: white !important;
            color: #1e293b !important;
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            font-size: 11px !important;
            line-height: 1.6 !important;
          }

          /* Page setup - Letters size */
          @page {
            size: letter;
            margin: 1.8cm 1.5cm;
          }

          .no-print {
            display: none !important;
          }

          /* Clean typography */
          h1, h2, h3, h4 {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
            color: #102A46 !important;
          }

          /* Homeowner card columns layout (4 columns on print) */
          #print-area .lg\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }

          #print-area label {
            color: #53677B !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            font-size: 8px !important;
            letter-spacing: 0.05em !important;
            margin-bottom: 4px !important;
            display: block !important;
            font-family: 'Plus Jakarta Sans', sans-serif !important;
          }

          #print-area input {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #102A46 !important;
            font-weight: 600 !important;
            font-size: 11px !important;
            width: 100% !important;
          }

          /* Table styling - modern, borderless rows with bottom borders */
          #print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 24px !important;
            margin-bottom: 24px !important;
            font-size: 10px !important;
          }

          #print-area th, #print-area td {
            border: none !important;
            border-bottom: 1px solid #E2E8F0 !important;
            padding: 10px 12px !important;
            text-align: left !important;
          }

          #print-area th {
            background-color: #102A46 !important;
            color: #FFFFFF !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            font-size: 8px !important;
            letter-spacing: 0.08em !important;
            font-family: 'Plus Jakarta Sans', sans-serif !important;
            border-bottom: none !important;
            padding: 10px 12px !important;
          }

          #print-area th:first-child {
            border-top-left-radius: 8px !important;
            border-bottom-left-radius: 8px !important;
          }

          #print-area th:last-child {
            border-top-right-radius: 8px !important;
            border-bottom-right-radius: 8px !important;
          }

          #print-area tr:last-child td {
            border-bottom: none !important;
          }

          /* Table row break management */
          #print-area tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #print-area thead {
            display: table-header-group !important;
          }

          #print-area .border-t {
            border-color: #E2E8F0 !important;
          }

          #print-area .text-right {
            text-align: right !important;
          }

          /* Signature blocks (2 columns, avoid breaking) */
          #print-area .print\:grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 40px !important;
            margin-top: 40px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #print-area .border-b {
            border-bottom: 1px solid #CBD5E1 !important;
          }

          @page {
            size: letter;
            margin: 14mm 15mm 16mm;
          }

          #print-area > :not(.pdf-document) {
            display: none !important;
          }

          #print-area .pdf-document {
            display: block !important;
            color: #25364a !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 9pt !important;
            line-height: 1.45 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .pdf-document * {
            box-sizing: border-box;
          }

          #print-area .pdf-header {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 22px;
            padding: 19px 20px;
            background: #ffffff !important;
            color: #102A46 !important;
            border: 1px solid #e0e7ec;
            border-top: 3px solid var(--pdf-primary, #102A46);
            border-bottom: 2px solid var(--pdf-accent, #8C6A22);
            border-radius: 9px;
            page-break-inside: avoid;
          }

          .pdf-brand { display: flex; flex: 1 1 auto; align-items: center; gap: 14px; min-width: 0; }
          .pdf-logo-frame { display: flex; width: 164px; height: 77px; flex: 0 0 164px; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #e5eaee; border-radius: 9px; background: #ffffff !important; }
          .pdf-logo { display: block; width: 100%; height: 100%; max-width: none; max-height: none; object-fit: contain; padding: 0; border: 0; border-radius: 0; background: transparent !important; }
          #print-area .pdf-logo-placeholder { width: 72px; height: 64px; flex: 0 0 72px; color: var(--pdf-primary, #102A46) !important; background: #f7f9fa !important; font-weight: 700; }
          #print-area .pdf-brand-name { margin: 0; color: var(--pdf-primary, #102A46) !important; font-size: 17pt; line-height: 1.15; font-weight: 750; letter-spacing: -.02em; }
          #print-area .pdf-brand-meta { max-width: 330px; margin-top: 6px; color: #657583 !important; font-size: 7.5pt; line-height: 1.5; }
          #print-area .pdf-doc-label { display: inline-flex; align-items: center; gap: 6px; color: var(--pdf-primary, #102A46) !important; font-size: 6.5pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
          #print-area .pdf-doc-label::before { content: ""; display: inline-block; width: 14px; height: 2px; border-radius: 2px; background: var(--pdf-accent, #8C6A22); }
          #print-area .pdf-doc-title { margin: 5px 0 0; color: var(--pdf-primary, #102A46) !important; font-size: 19pt; line-height: 1.1; font-weight: 750; letter-spacing: -.02em; }
          .pdf-doc-meta { min-width: 190px; flex-shrink: 0; padding: 10px 13px; border-left: 2px solid var(--pdf-accent, #8C6A22); border-radius: 0 7px 7px 0; background: #F4F6F8 !important; background: color-mix(in srgb, var(--pdf-primary, #102A46) 5%, #ffffff) !important; text-align: left; }
          .pdf-ref-label { margin-top: 9px; color: #71808c !important; font-size: 6.5pt; text-transform: uppercase; letter-spacing: .12em; }
          .pdf-ref-value { color: var(--pdf-primary, #102A46) !important; font-family: Consolas, monospace; font-size: 9.5pt; font-weight: 700; }
          .pdf-status { display: inline-block; margin-top: 7px; border: 1px solid #d6dfe5; border-radius: 999px; padding: 3px 8px; color: var(--pdf-primary, #102A46) !important; background: #fff !important; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
          .pdf-section { margin-top: 22px; page-break-inside: avoid; }
          .pdf-section-title { display: flex; align-items: center; gap: 9px; margin: 0 0 10px; color: var(--pdf-primary, #102A46) !important; font-size: 9pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          .pdf-section-title::before { content: ""; display: inline-block; width: 3px; height: 14px; background: var(--pdf-accent, #8C6A22); }
          .pdf-client-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(58px, auto); gap: 8px; min-width: 0; border: 0; }
          .pdf-client-cell { display: flex; min-width: 0; min-height: 58px; flex-direction: column; justify-content: center; padding: 10px 12px; border: 1px solid #e0e7ec; border-left: 2px solid var(--pdf-accent, #8C6A22); border-radius: 7px; background: #f8fafb !important; }
          .pdf-field-label { display: block; min-width: 0; margin-bottom: 5px; color: #53677B !important; font-size: 6.5pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
          .pdf-field-value { display: block; min-width: 0; max-width: 100%; color: #102A46 !important; font-size: 9pt; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; word-break: break-word; white-space: normal !important; }
          #print-area .pdf-table { width: 100% !important; margin: 0 !important; border-collapse: collapse; table-layout: fixed; }
          #print-area .pdf-table th { padding: 9px 8px !important; background: #e9eef1 !important; color: #405367 !important; border-bottom: 1px solid #cbd5dc !important; font-size: 6.5pt !important; letter-spacing: .08em; text-transform: uppercase; }
          #print-area .pdf-table td { padding: 9px 8px !important; border-bottom: 1px solid #e3e8eb !important; color: #25364a !important; font-size: 8pt; vertical-align: top; }
          #print-area .pdf-table tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          .pdf-table .pdf-col-desc { width: 48%; }
          .pdf-table .pdf-col-type { width: 14%; }
          .pdf-table .pdf-col-qty { width: 10%; }
          .pdf-table .pdf-col-unit { width: 9%; }
          .pdf-table .pdf-col-price { width: 10%; }
          .pdf-table .pdf-col-total { width: 9%; }
          .pdf-table .pdf-right { text-align: right !important; }
          .pdf-table .pdf-center { text-align: center !important; }
          .pdf-category { color: #53677B !important; font-size: 7pt !important; text-transform: capitalize; }
          .pdf-empty { padding: 20px !important; color: #596D80 !important; text-align: center !important; font-style: italic; }
          .pdf-bottom-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 24px; align-items: start; }
          .pdf-note { padding: 12px 14px; border-left: 2px solid #8C6A22; background: #F4F6F8 !important; color: #465D70 !important; font-size: 8pt; }
          .pdf-totals { border: 1px solid #d7e0e6; }
          .pdf-total-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 11px; border-bottom: 1px solid #e3e8eb; color: #465D70 !important; font-size: 8pt; }
          .pdf-total-row strong { color: #102A46 !important; font-family: Consolas, monospace; font-size: 8pt; }
          .pdf-grand-total { padding: 12px 11px; background: var(--pdf-primary, #102A46) !important; color: white !important; }
          .pdf-grand-total span, .pdf-grand-total strong { color: white !important; }
          .pdf-grand-total strong { font-size: 14pt; }
          .pdf-subsection-label { margin: 12px 0 5px; color: #53677B !important; font-size: 6.5pt; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
          .pdf-terms { color: #465D70 !important; font-size: 8pt; white-space: pre-wrap; }
          .pdf-warranties { margin: 6px 0 0; padding-left: 16px; color: #465D70 !important; font-size: 8pt; }
          .pdf-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; margin-top: 36px; page-break-inside: avoid; }
          .pdf-signature-line { height: 34px; border-bottom: 1px solid #82909b; }
          .pdf-signature-label { margin-top: 7px; color: #465D70 !important; font-size: 7pt; }
          .pdf-footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #d7e0e6; color: #82909b !important; font-size: 6.5pt; display: flex; justify-content: space-between; }
        }
      `}</style>

      {/* Left Sidebar: Retail Directory */}
      <div className="estimator-case-list no-print w-[290px] border-r border-[#DCE4EB]/30 bg-white flex flex-col shrink-0 select-none">
        <div className="p-4 border-b border-[#DCE4EB]/30 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#102A46] uppercase tracking-wider">Estimados Retail</h2>
            <button
              onClick={() => setIsAddingLead(true)}
              className="p-1 bg-[#8C6A22] hover:bg-[#664A14] text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center btn-gold-3d"
              title="Nueva Cotización"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cotización..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f2f4f6] border border-transparent rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:bg-white focus:border-[#8C6A22] font-medium"
            />
            <Search className="w-3.5 h-3.5 text-[#566A7E] absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredLeads.length === 0 ? (
            <p className="text-xs text-[#566A7E] text-center py-6 font-medium">No se encontraron cotizaciones.</p>
          ) : (
            filteredLeads.map((l) => {
              const isActive = l.id === selectedLeadId;
              const est = l.estimate || { status: 'Draft', total: 0 };
              return (
                <div
                  key={l.id}
                  onClick={() => setSelectedLeadId(l.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-150 border text-left ${
                    isActive
                      ? "bg-[#8C6A22]/10 border-[#8C6A22] shadow-sm"
                      : "bg-white border-[#DCE4EB]/20 hover:bg-[#F4F6F8]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {onDeleteLead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Estás seguro de que deseas eliminar la cotización de ${l.name}?`)) {
                              onDeleteLead(l.id);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                          title="Eliminar Cotización"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <span className="text-xs font-bold text-[#102A46] truncate">{l.name}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border shrink-0 ${
                      est.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : est.status === "Sent"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}>
                      {est.status === "Approved" ? "Aprobado" : est.status === "Sent" ? "Enviado" : "Borrador"}
                    </span>
                  </div>
                  {l.address && (
                    <span className="text-[10px] text-[#566A7E] block truncate mt-0.5 font-medium">{l.address}</span>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-gray-100">
                    <span className="text-[10px] text-[#566A7E] font-medium">{l.createdAt}</span>
                    <span className="text-xs font-bold text-[#102A46] font-mono">
                      ${(est.total || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content: Active Estimator Editor */}
      <div className="estimator-workbench flex-1 flex flex-col h-screen overflow-y-auto">
        {!selectedLead ? (
          <div className="no-print flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center text-[#664A14] mb-4">
              <FileSignature className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#102A46]">Sin Estimados Retail</h2>
            <p className="text-xs text-[#566A7E] mt-1 max-w-sm font-medium">Comienza registrando tu primera cotización de venta directa en el sistema.</p>
            <button
              onClick={() => setIsAddingLead(true)}
              className="mt-4 px-4 py-2 bg-[#8C6A22] hover:bg-[#664A14] text-slate-900 font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 btn-gold-3d"
            >
              Crear Cotización Retail
            </button>
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-6">

            {/* Header / Actions */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE4EB]/30 pb-4">
              <div>
                <h1 className="font-sans text-[26px] font-bold text-[#102A46] tracking-tight">Estimador Retail</h1>
                <p className="font-sans text-xs text-[#566A7E] mt-1 font-medium">{userRole === 'admin' ? 'Borrador de presupuestos de venta directa (Retail) con validación de márgenes de ganancia.' : 'Cotizaciones de venta directa con los datos y la identidad de tu empresa.'}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-white border border-[#DCE4EB] hover:bg-slate-100 text-[#45464d] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Descargar versión PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar PDF
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 bg-white border border-[#DCE4EB] hover:bg-slate-100 text-[#45464d] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="El envío automático requiere configurar un proveedor de correo. Descarga el PDF para compartirlo."
                >
                  <Mail className="w-3.5 h-3.5" />
                  Correo sin configurar
                </button>
                <button
                  onClick={() => handleUpdateStatus("Approved")}
                  className={`px-3 py-1.5 bg-[#8C6A22] hover:bg-[#664A14] text-slate-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm btn-gold-3d`}
                >
                  Aprobar Estimado
                </button>
              </div>
            </div>

            {/* Print Section (Wraps details inside a printable preview) */}
            <div id="print-area" className="space-y-6">

              <article className="pdf-document hidden print:block" style={{ "--pdf-primary": pdfPrimaryColor, "--pdf-accent": pdfAccentColor } as React.CSSProperties}>
                <header className="pdf-header">
                  <div className="pdf-brand">
                    {pdfUsesOrganizationBranding ? (
                      pdfCompanyLogo ? <div className="pdf-logo-frame"><img src={pdfCompanyLogo} alt={`${pdfCompanyName} logo`} className="pdf-logo" referrerPolicy="no-referrer" /></div> :
                        <div className="pdf-logo-frame pdf-logo-placeholder flex items-center justify-center">{pdfCompanyName.substring(0, 2).toUpperCase()}</div>
                    ) : <div className="pdf-logo-frame"><img src={logoXapcon} alt="Xapcon Group" className="pdf-logo" /></div>}
                    <div>
                      <p className="pdf-brand-name">{pdfUsesOrganizationBranding ? pdfCompanyName : "Xapcon Group"}</p>
                      <p className="pdf-brand-meta">
                        {pdfUsesOrganizationBranding ? (
                          <>
                            {activeOrganization?.license_number && <>License #{activeOrganization.license_number}</>}
                            {activeOrganization?.registration_number && <>{activeOrganization?.license_number ? " · " : ""}Reg. #{activeOrganization.registration_number}</>}
                            {(activeOrganization?.license_number || activeOrganization?.registration_number) && <br />}
                            {[activeOrganization?.company_email, activeOrganization?.company_phone, activeOrganization?.company_website].filter(Boolean).join(" · ") || "Residential Roofing Services"}
                            {activeOrganization?.company_address && <><br />{activeOrganization.company_address}</>}
                          </>
                        ) : <>License #98240-TX · Roofing & Restoration</>}
                      </p>
                    </div>
                  </div>
                  <div className="pdf-doc-meta">
                    <div className="pdf-doc-label">Prepared for your property</div>
                    <h1 className="pdf-doc-title">Retail Estimate</h1>
                    <div className="pdf-ref-label">Estimate reference</div>
                    <div className="pdf-ref-value">{activeEstimate.id}</div>
                    <span className="pdf-status">{activeEstimate.status}</span>
                  </div>
                </header>

                <section className="pdf-section">
                  <h2 className="pdf-section-title">Project and customer information</h2>
                  <div className="pdf-client-grid">
                    <div className="pdf-client-cell"><span className="pdf-field-label">Homeowner</span><span className="pdf-field-value">{activeEstimate.clientName || selectedLead.name || "—"}</span></div>
                    <div className="pdf-client-cell"><span className="pdf-field-label">Project address</span><span className="pdf-field-value">{activeEstimate.address || "—"}</span></div>
                    <div className="pdf-client-cell"><span className="pdf-field-label">Phone</span><span className="pdf-field-value">{activeEstimate.clientPhone || "—"}</span></div>
                    <div className="pdf-client-cell"><span className="pdf-field-label">Estimate date</span><span className="pdf-field-value">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div>
                  </div>
                  {activeEstimate.clientEmail && <div className="pdf-client-grid" style={{ gridTemplateColumns: "1fr", borderTop: 0 }}><div className="pdf-client-cell" style={{ minHeight: 0 }}><span className="pdf-field-label">Email</span><span className="pdf-field-value">{activeEstimate.clientEmail}</span></div></div>}
                </section>

                <section className="pdf-section">
                  <h2 className="pdf-section-title">Scope of work and pricing schedule</h2>
                  <table className="pdf-table">
                    <thead><tr>
                      <th className="pdf-col-desc">Description</th><th className="pdf-col-type">Classification</th>
                      <th className="pdf-col-qty pdf-right">Quantity</th><th className="pdf-col-unit pdf-center">Unit</th>
                      <th className="pdf-col-price pdf-right">Unit price</th><th className="pdf-col-total pdf-right">Line total</th>
                    </tr></thead>
                    <tbody>
                      {activeEstimate.items.length ? activeEstimate.items.map(item => (
                        <tr key={item.id}>
                          <td>{item.description}</td><td className="pdf-category">{item.category === "material" ? "Material" : item.category === "labor" ? "Labor" : "Permit / fee"}</td>
                          <td className="pdf-right">{item.qty.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="pdf-center">{item.unit}</td>
                          <td className="pdf-right">${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="pdf-right"><strong>${item.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                        </tr>
                      )) : <tr><td colSpan={6} className="pdf-empty">No work items have been added to this estimate.</td></tr>}
                    </tbody>
                  </table>
                </section>

                <section className="pdf-section pdf-bottom-grid">
                  <div>
                    <h2 className="pdf-section-title">Work terms and commitment</h2>
                    <div className="pdf-note"><p className="pdf-terms">{activeEstimate.termsAndCommitment ?? DEFAULT_TERMS_TEXT}</p></div>
                    <p className="pdf-subsection-label">Applicable warranties</p>
                    <ul className="pdf-warranties">
                      {(() => {
                        const warrantyLabels: Record<string, string> = { labor_5: "5-year labor warranty", labor_10: "10-year labor warranty", material_5: "5-year material warranty", material_8: "8-year material warranty", material_10: "10-year material warranty", material_12: "12-year material warranty", material_15: "15-year material warranty", material_20: "20-year material warranty", material_25: "25-year material warranty" };
                        const selected = (activeEstimate.warrantyTypes || (activeEstimate.warrantyType ? [activeEstimate.warrantyType] : [])).filter(w => w !== "none");
                        return selected.length ? selected.map(w => <li key={w}>{warrantyLabels[w] || w}</li>) : <li>Standard warranty addendum excluded.</li>;
                      })()}
                    </ul>
                  </div>
                  <div>
                    <h2 className="pdf-section-title">Investment summary <span style={{ marginLeft: "auto", fontSize: "6.5pt", letterSpacing: ".08em", color: "#53677B" }}>USD</span></h2>
                    <div className="pdf-totals">
                      <div className="pdf-total-row"><span>Materials</span><strong>${activeEstimate.subtotalMaterials.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                      <div className="pdf-total-row"><span>Labor</span><strong>${activeEstimate.subtotalLabor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                      <div className="pdf-total-row"><span>Permits and fees</span><strong>${activeEstimate.subtotalFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                      <div className="pdf-total-row"><span>Subtotal</span><strong>${activeEstimate.subtotalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                      <div className="pdf-total-row"><span>Tax ({(activeEstimate.taxRate * 100).toFixed(2)}%)</span><strong>${activeEstimate.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                      <div className="pdf-total-row pdf-grand-total"><span>Total estimate</span><strong>${activeEstimate.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                    </div>
                  </div>
                </section>

                <section className="pdf-signatures">
                  <div><div className="pdf-signature-line" /><p className="pdf-signature-label">Homeowner approval · Signature and date</p></div>
                  <div><div className="pdf-signature-line" /><p className="pdf-signature-label">Authorized representative · Signature and date</p></div>
                </section>
                <footer className="pdf-footer"><span>{pdfUsesOrganizationBranding ? pdfCompanyName : "Xapcon Group"} · Retail estimate</span><span>Reference {activeEstimate.id}</span></footer>
              </article>

              {/* PDF Header Branding (Only visible on print/PDF) */}
              <div className="hidden print:flex justify-between items-start border-b border-gray-200/80 pb-6 mb-6">
                <div className="flex items-start gap-4">
                  {userRole === "contractor" ? (
                    <>
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Logo Empresa"
                          referrerPolicy="no-referrer"
                          className="h-16 w-auto object-contain shrink-0 rounded-lg border border-slate-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center text-[#664A14] font-extrabold text-lg shrink-0 uppercase">
                          {(activeOrganization?.name || "CO").substring(0, 2)}
                        </div>
                      )}
                      <div className="space-y-1 text-left">
                        <h1 className="text-xl font-extrabold text-[#102A46] tracking-tight uppercase font-sans">
                          {activeOrganization?.name || "CONSTRUCTION ESTIMATE"}
                        </h1>
                        <div className="border-l-2 border-[#8C6A22] pl-3 text-[10px] text-slate-500 font-mono space-y-0.5">
                          <div className="font-bold text-slate-700">Lic. #{profile?.license_number || "N/A"} · Reg. #{profile?.registration_number || "N/A"}</div>
                          {(profile?.company_email || profile?.company_website) && (
                            <div>
                              {profile?.company_email && <span>Email: {profile.company_email}</span>}
                              {profile?.company_email && profile?.company_website && <span> · </span>}
                              {profile?.company_website && <span>Web: {profile.company_website}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={logoXapcon}
                        alt="Xapcon Group Logo"
                        className="h-16 w-auto object-contain shrink-0"
                      />
                      <div className="space-y-1 text-left">
                        <h1 className="text-xl font-extrabold text-[#102A46] tracking-tight uppercase font-sans">
                          RETAIL ESTIMATE
                        </h1>
                        <div className="border-l-2 border-[#8C6A22] pl-3 text-[10px] text-slate-500 font-mono">
                          <span className="font-bold text-slate-700 block">Xapcon Group</span>
                          <span>Lic. #98240-TX</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Modern metadata box */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 text-right min-w-[190px] shadow-sm">
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#53677B] font-sans">Estimate Details</div>
                  <div className="text-sm font-black text-[#102A46] mt-0.5 tracking-tight font-mono">{activeEstimate.id}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-200/60">
                    Date: {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Homeowner Details Card */}
              <div className="bg-white print:bg-[#f8fafc] border border-[#DCE4EB]/30 print:border-[#e2e8f0] rounded-2xl print:rounded-xl p-5 print:p-4 shadow-sm print:shadow-none space-y-4 print:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-[#664A14] shrink-0 print:hidden">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-sans text-xs font-bold text-[#102A46]">
                        <span className="print:hidden">Datos del Homeowner (Propietario)</span>
                        <span className="hidden print:inline">Homeowner Information</span>
                      </h2>
                      <p className="text-[10px] text-[#566A7E] font-medium print:hidden">Información de contacto y dirección de la obra</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <span className="font-sans text-xs text-[#566A7E] font-medium">Estado:</span>
                    <select
                      value={activeEstimate.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      className="bg-gray-50 border border-gray-300 rounded-lg py-1 px-2 text-[10px] font-bold text-[#102A46] outline-none cursor-pointer"
                    >
                      <option value="Draft">Borrador (Draft)</option>
                      <option value="Sent">Enviado (Sent)</option>
                      <option value="Approved">Aprobado (Approved)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Inputs render as editable inside UI, but static text in print mode */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#566A7E] mb-1">
                      <span className="print:hidden">Nombre</span>
                      <span className="hidden print:inline">Name</span>
                    </label>
                    <input
                      type="text"
                      value={activeEstimate.clientName}
                      onChange={(e) => handleUpdateHomeownerDetails("clientName", e.target.value)}
                      className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#8C6A22] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Nombre del Homeowner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#566A7E] mb-1">
                      <span className="print:hidden">Dirección de la Obra</span>
                      <span className="hidden print:inline">Job Address</span>
                    </label>
                    <input
                      type="text"
                      value={activeEstimate.address}
                      onChange={(e) => handleUpdateHomeownerDetails("address", e.target.value)}
                      className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#8C6A22] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Dirección completa"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#566A7E] mb-1">
                      <span className="print:hidden">Teléfono</span>
                      <span className="hidden print:inline">Phone</span>
                    </label>
                    <input
                      type="text"
                      value={activeEstimate.clientPhone || ""}
                      onChange={(e) => handleUpdateHomeownerDetails("clientPhone", e.target.value)}
                      className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#8C6A22] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Teléfono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#566A7E] mb-1">
                      <span className="print:hidden">Correo Electrónico</span>
                      <span className="hidden print:inline">Email</span>
                    </label>
                    <input
                      type="email"
                      value={activeEstimate.clientEmail || ""}
                      onChange={(e) => handleUpdateHomeownerDetails("clientEmail", e.target.value)}
                      className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#8C6A22] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Correo electrónico"
                    />
                  </div>
                </div>
              </div>

              {/* Item List Table Card */}
              <div className="bg-white print:bg-transparent border border-[#DCE4EB]/30 print:border-none rounded-2xl shadow-sm print:shadow-none overflow-hidden print:overflow-visible">
                <div className="p-4 border-b border-[#E6ECF1] flex items-center justify-between no-print">
                  <h2 className="font-sans text-xs font-bold text-[#102A46]">Desglose de Conceptos de Construcción</h2>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCatalogModal(true)}
                      className="text-xs text-gray-500 hover:text-[#664A14] font-bold flex items-center gap-1 hover:underline transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#664A14]" />
                      Catálogo de Materiales
                    </button>
                    <button
                      onClick={() => setIsAddingItem(!isAddingItem)}
                      className="text-xs text-[#664A14] font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Concepto
                    </button>
                  </div>
                </div>

                {isAddingItem && (
                  <form onSubmit={handleAddItem} className="no-print p-4 bg-[#F4F6F8] border-b border-[#E6ECF1] grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4 relative">
                      <label className="block text-[10px] font-bold text-[#566A7E] mb-1">Descripción</label>
                      <input
                        type="text"
                        value={newDesc}
                        onChange={(e) => {
                          setNewDesc(e.target.value);
                          setShowAutocomplete(true);
                        }}
                        onFocus={() => setShowAutocomplete(true)}
                        onBlur={() => {
                          setTimeout(() => setShowAutocomplete(false), 200);
                        }}
                        placeholder="Ej. Tejas de asfalto"
                        className="w-full bg-white border border-[#DCE4EB] rounded-lg p-1.5 text-xs text-[#191c1e] outline-none focus:border-[#8C6A22]"
                        required
                      />
                      {/* Autocomplete Dropdown */}
                      {(() => {
                        const catalog = globalMaterials as MaterialItem[];
                        const matchingItems = newDesc.trim()
                          ? catalog.filter(m => m.description.toLowerCase().includes(newDesc.toLowerCase()))
                          : [];
                        const showDropdown = showAutocomplete && matchingItems.length > 0;

                        if (!showDropdown) return null;

                        return (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 text-xs divide-y divide-gray-100">
                            {matchingItems.slice(0, 15).map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setNewDesc(item.description);
                                  setNewCategory(item.category);
                                  setNewUnit(item.unit);
                                  setNewPrice(String(item.unitPrice));
                                  setShowAutocomplete(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2"
                              >
                                <span className="font-semibold text-slate-800 truncate">{item.description}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase shrink-0">
                                  ${item.unitPrice} / {item.unit}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-[#566A7E] mb-1">Categoría</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        className="w-full bg-white border border-[#DCE4EB] rounded-lg p-1.5 text-xs text-[#191c1e]"
                      >
                        <option value="material">Material</option>
                        <option value="labor">Mano de Obra</option>
                        <option value="fee">Tasa / Permiso</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-[#566A7E] mb-1">Cant.</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newQty}
                        onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) setNewQty(e.target.value); }}
                        className="w-full bg-white border border-[#DCE4EB] rounded-lg p-1.5 text-xs text-[#191c1e]"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-[#566A7E] mb-1">Unidad</label>
                      <input
                        type="text"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        className="w-full bg-white border border-[#DCE4EB] rounded-lg p-1.5 text-xs text-[#191c1e]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-[#566A7E] mb-1">P. Unitario</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newPrice}
                        onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) setNewPrice(e.target.value); }}
                        className="w-full bg-white border border-[#DCE4EB] rounded-lg p-1.5 text-xs text-[#191c1e]"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(false)}
                        className="flex-1 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-[#8C6A22] text-slate-900 font-bold text-xs rounded-lg shadow-sm btn-gold-3d"
                      >
                        Añadir
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto select-none">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F4F6F8] border-b border-[#E6ECF1] text-[#566A7E] text-[10px] font-mono uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">
                          <span className="print:hidden">Concepto</span>
                          <span className="hidden print:inline">Item Description</span>
                        </th>
                        <th className="py-3 px-4 text-center">
                          <span className="print:hidden">Cantidad</span>
                          <span className="hidden print:inline">Quantity</span>
                        </th>
                        <th className="py-3 px-4 text-center">
                          <span className="print:hidden">Unidad</span>
                          <span className="hidden print:inline">Unit</span>
                        </th>
                        <th className="py-3 px-4 text-right">
                          <span className="print:hidden">Precio Unitario</span>
                          <span className="hidden print:inline">Unit Price</span>
                        </th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-center no-print">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6ECF1]">
                      {activeEstimate.items.map((item) => (
                        <tr key={item.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-medium">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[#191c1e] block">{item.description}</span>
                              <span className="text-[10px] text-[#566A7E] font-mono uppercase bg-[#E6ECF1] px-1.5 py-0.5 rounded w-max block print:hidden">{item.category}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-semibold">
                            <span className="hidden print:inline">{item.qty}</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={itemNumericDrafts[`${item.id}:qty`] ?? String(item.qty)}
                              onChange={(e) => updateItemNumericDraft(item.id, "qty", e.target.value)}
                              onBlur={() => clearItemNumericDraft(item.id, "qty")}
                              className="no-print w-16 bg-[#F4F6F8] border border-[#DCE4EB]/50 rounded p-1 text-center font-semibold text-xs"
                            />
                          </td>
                          <td className="py-4 px-4 text-center text-[#566A7E] font-medium">{item.unit}</td>
                          <td className="py-4 px-4 text-right font-medium">
                            <span className="hidden print:inline">${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            <div className="no-print flex items-center justify-end gap-1">
                              <span className="text-[#566A7E] font-medium">$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={itemNumericDrafts[`${item.id}:unitPrice`] ?? String(item.unitPrice)}
                                onChange={(e) => updateItemNumericDraft(item.id, "unitPrice", e.target.value)}
                                onBlur={() => clearItemNumericDraft(item.id, "unitPrice")}
                                className="w-20 bg-[#F4F6F8] border border-[#DCE4EB]/50 rounded p-1 text-right font-semibold text-xs"
                              />
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-[#102A46]">${item.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4 text-center no-print">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary panel + Warranty Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                {/* Warranty Digital Contract terms */}
                <div className="bg-white print:bg-[#f8fafc] border border-[#DCE4EB]/30 print:border-[#e2e8f0] rounded-2xl print:rounded-xl p-5 print:p-4 shadow-sm print:shadow-none space-y-4 print:space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 text-[#102A46] font-bold text-xs">
                    <FileText className="w-4 h-4 text-[#664A14] print:hidden" />
                    <span>
                      <span className="print:hidden">Terminos y compromiso del Servicio</span>
                      <span className="hidden print:inline">Terms and Service Commitment</span>
                    </span>
                  </div>

                  {/* Screen Mode: Editable Textarea */}
                  <div className="print:hidden">
                    <textarea
                      value={activeEstimate.termsAndCommitment ?? DEFAULT_TERMS_TEXT}
                      onChange={(e) => handleUpdateTermsText(e.target.value)}
                      className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/40 rounded-lg p-2.5 text-xs text-[#191c1e] focus:bg-white focus:border-[#8C6A22] outline-none transition-all font-medium h-36 resize-y"
                      placeholder="Escribe los términos y compromiso del servicio aquí..."
                    />
                  </div>

                  {/* Print Mode: Plain Text */}
                  <p className="hidden print:block text-[11px] text-[#566A7E] leading-relaxed whitespace-pre-wrap">
                    {activeEstimate.termsAndCommitment ?? DEFAULT_TERMS_TEXT}
                  </p>

                  <div className="space-y-2 print:border-none print:bg-transparent print:p-0">
                    <label className="block text-[10px] font-bold text-[#566A7E] print:hidden uppercase tracking-wider mb-1">Garantías Aplicables</label>

                    {/* Screen Mode: Scrollable Checkbox Checklist */}
                    <div className="print:hidden space-y-2 max-h-56 overflow-y-auto pr-1 border border-[#DCE4EB]/25 rounded-lg p-2 bg-[#F4F6F8]">
                      {[
                        { id: "labor_5", label: "Incluye garantía estándar (5 años mano de obra)" },
                        { id: "labor_10", label: "Incluye garantía estándar (10 años mano de obra)" },
                        { id: "material_5", label: "Incluye garantía estándar (5 años en Material)" },
                        { id: "material_8", label: "Incluye garantía estándar (8 años en Material)" },
                        { id: "material_10", label: "Incluye garantía estándar (10 años en Material)" },
                        { id: "material_12", label: "Incluye garantía estándar (12 años en Material)" },
                        { id: "material_15", label: "Incluye garantía estándar (15 años en Material)" },
                        { id: "material_20", label: "Incluye garantía estándar (20 años en Material)" },
                        { id: "material_25", label: "Incluye garantía estándar (25 años en Material)" }
                      ].map((opt) => {
                        const wTypes = activeEstimate.warrantyTypes || (activeEstimate.warrantyType ? [activeEstimate.warrantyType] : []);
                        const isChecked = wTypes.includes(opt.id);

                        return (
                          <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-white rounded transition-colors select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleWarrantyType(opt.id)}
                              className="rounded text-[#664A14] focus:ring-[#8C6A22]"
                            />
                            <span className="text-xs font-semibold text-[#191c1e]">
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Print Mode: List of Selected Warranties in English */}
                    <div className="hidden print:block space-y-1">
                      {(() => {
                        const wTypes = activeEstimate.warrantyTypes || (activeEstimate.warrantyType ? [activeEstimate.warrantyType] : []);
                        if (wTypes.length === 0 || (wTypes.length === 1 && wTypes[0] === "none")) {
                          return <span className="text-xs font-semibold text-[#191c1e]">Standard warranty addendum excluded</span>;
                        }

                        return wTypes.filter(w => w !== "none").map((wType) => {
                          let text = "";
                          switch(wType) {
                            case "labor_5": text = "Includes standard warranty (5-year labor warranty)"; break;
                            case "labor_10": text = "Includes standard warranty (10-year labor warranty)"; break;
                            case "material_5": text = "Includes standard warranty (5-year material warranty)"; break;
                            case "material_8": text = "Includes standard warranty (8-year material warranty)"; break;
                            case "material_10": text = "Includes standard warranty (10-year material warranty)"; break;
                            case "material_12": text = "Includes standard warranty (12-year material warranty)"; break;
                            case "material_15": text = "Includes standard warranty (15-year material warranty)"; break;
                            case "material_20": text = "Includes standard warranty (20-year material warranty)"; break;
                            case "material_25": text = "Includes standard warranty (25-year material warranty)"; break;
                          }
                          return text ? <div key={wType} className="text-xs font-semibold text-[#191c1e]">{text}</div> : null;
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Totals and Profit Margin widget */}
                <div className="bg-white print:bg-[#f8fafc] border border-[#DCE4EB]/30 print:border-[#e2e8f0] rounded-2xl print:rounded-xl p-5 print:p-4 shadow-sm print:shadow-none space-y-4 print:space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-sans text-xs font-bold text-[#102A46]">
                      <span className="print:hidden">Resumen de Cierre de Cotización</span>
                      <span className="hidden print:inline">Estimate Summary</span>
                    </h3>
                    <span className="font-sans text-[11px] text-[#566A7E] font-medium">
                      <span className="print:hidden">Valores en USD</span>
                      <span className="hidden print:inline">Values in USD</span>
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#566A7E]">
                        <span className="print:hidden">Subtotal Materiales:</span>
                        <span className="hidden print:inline">Materials Subtotal:</span>
                      </span>
                      <span className="font-mono font-bold text-[#45464d]">${activeEstimate.subtotalMaterials.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#566A7E]">
                        <span className="print:hidden">Subtotal Mano de Obra:</span>
                        <span className="hidden print:inline">Labor Subtotal:</span>
                      </span>
                      <span className="font-mono font-bold text-[#45464d]">${activeEstimate.subtotalLabor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#566A7E]">
                        <span className="print:hidden">Permisos y Tasas Administrativas:</span>
                        <span className="hidden print:inline">Permits & Administrative Fees:</span>
                      </span>
                      <span className="font-mono font-bold text-[#45464d]">${activeEstimate.subtotalFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-[#102A46]">
                      <span>
                        <span className="print:hidden">Subtotal Bruto:</span>
                        <span className="hidden print:inline">Gross Subtotal:</span>
                      </span>
                      <span className="font-mono">${activeEstimate.subtotalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[#566A7E]">
                      <span>
                        <span className="print:hidden">Impuestos ({(activeEstimate.taxRate * 100).toFixed(2)}%):</span>
                        <span className="hidden print:inline">Tax ({(activeEstimate.taxRate * 100).toFixed(2)}%):</span>
                      </span>
                      <span className="font-mono">${activeEstimate.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-lg text-[#102A46]">
                      <span>
                        <span className="print:hidden">Total Estimado:</span>
                        <span className="hidden print:inline">Estimated Total:</span>
                      </span>
                      <span className="font-mono">${activeEstimate.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Internal financial data is superadmin-only. */}
                  {userRole === "admin" && <div className="bg-[#F4F6F8] border border-[#DCE4EB]/30 rounded-xl p-4 no-print">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-[#45464d] flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-[#664A14]" />
                        <span>Margen de Beneficio Estimado</span>
                      </span>
                      <span className={`font-mono font-bold text-xs ${isMarginUnderStandard ? "text-amber-600" : "text-yellow-600"}`}>
                        {activeEstimate.profitMargin}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E6ECF1] rounded-full h-2 overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isMarginUnderStandard ? "bg-amber-500" : "bg-[#8C6A22]"}`}
                        style={{ width: `${Math.min(100, (activeEstimate.profitMargin / 50) * 100)}%` }}
                      ></div>
                    </div>

                    {isMarginUnderStandard && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-amber-50/60 p-2.5 border border-amber-100 rounded-lg">
                        <p className="text-[10px] text-amber-800 font-semibold leading-tight flex-1">
                          El margen proyectado es inferior al estándar mínimo (30%).
                        </p>
                        <button
                          type="button"
                          onClick={handleAutoAdjustMargin}
                          className="px-3 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700 active:scale-95 transition-all shadow-sm shrink-0"
                        >
                          Auto-ajustar al 30%
                        </button>
                      </div>
                    )}
                  </div>}
                </div>
              </div>

              {/* PDF Print Signature lines (Only visible on print/PDF) */}
              <div className="hidden print:grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-gray-300">
                <div className="space-y-8">
                  <p className="text-xs text-gray-500 font-medium">Approved by Customer (Homeowner):</p>
                  <div className="border-b border-gray-400 h-8 w-2/3"></div>
                  <p className="text-[10px] text-slate-500">Signature / Date</p>
                </div>
                <div className="space-y-8 text-right flex flex-col items-end">
                  <p className="text-xs text-gray-500 font-medium">Authorized Representative ({userRole === "contractor" ? (activeOrganization?.name || "Contractor") : "Xapcon Group"}):</p>
                  <div className="border-b border-gray-400 h-8 w-2/3"></div>
                  <p className="text-[10px] text-slate-500">Signature / Date</p>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Modal: New Estimate Lead Registration */}
      {isAddingLead && (
        <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE4EB]/30 rounded-2xl p-6 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-150 animate-fade-in select-none">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#664A14]" />
                <h3 className="font-bold text-sm text-[#102A46]">Nueva Cotización Retail</h3>
              </div>
              <button
                onClick={() => setIsAddingLead(false)}
                className="text-[#566A7E] hover:text-red-500 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#566A7E] uppercase tracking-wider mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#8C6A22] font-medium"
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#566A7E] uppercase tracking-wider mb-1">Dirección de la Propiedad</label>
                <input
                  type="text"
                  value={newLeadAddress}
                  onChange={(e) => setNewLeadAddress(e.target.value)}
                  className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#8C6A22] font-medium"
                  placeholder="Calle, Ciudad, Estado, Zip"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#566A7E] uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#8C6A22] font-medium"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#566A7E] uppercase tracking-wider mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full bg-[#F4F6F8] border border-[#DCE4EB]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#8C6A22] font-medium"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingLead(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8C6A22] hover:bg-[#664A14] text-slate-900 font-bold text-xs rounded-lg transition-colors shadow-sm btn-gold-3d"
                >
                  Crear Cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {showToast && (
        <div className="no-print fixed bottom-6 right-6 bg-[#102A46] border border-emerald-500 text-white rounded-xl p-4 shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-100">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Materials Catalog Modal */}
      {showCatalogModal && (
        <MaterialsCatalogModal onClose={() => setShowCatalogModal(false)} />
      )}

    </div>
  );
}
