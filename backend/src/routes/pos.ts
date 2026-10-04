import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// In-memory fallback / cache for POS Inventory Machines & Companies if DB model is dynamic
let inMemoryCompanies: string[] = [];
let inMemoryMachines: any[] = [];

// GET /api/pos/companies - Fetch all POS vendor companies
router.get("/companies", async (_req, res) => {
  try {
    res.json(inMemoryCompanies);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch companies" });
  }
});

// POST /api/pos/companies - Add new POS vendor company
router.post("/companies", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Company name is required" });
    }
    const upper = name.trim().toUpperCase();
    if (!inMemoryCompanies.includes(upper)) {
      inMemoryCompanies.push(upper);
    }
    res.json({ success: true, company: upper, companies: inMemoryCompanies });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to add company" });
  }
});

// GET /api/pos/inventory - Fetch all POS machines
router.get("/inventory", async (_req, res) => {
  try {
    res.json(inMemoryMachines);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch POS inventory" });
  }
});

// POST /api/pos/inventory - Register new POS machine
router.post("/inventory", async (req, res) => {
  try {
    const { companyName, bankName, serialNumber, tidNumber, midNumber } = req.body;
    if (!serialNumber || !tidNumber || !midNumber) {
      return res.status(400).json({ error: "Serial number, TID, and MID are required" });
    }
    const companyUpper = (companyName || "GENERAL").trim().toUpperCase();
    if (!inMemoryCompanies.includes(companyUpper)) {
      inMemoryCompanies.push(companyUpper);
    }
    const newMachine = {
      id: (inMemoryMachines.length + 1).toString(),
      companyName: companyUpper,
      bankName: bankName || "Axis Bank",
      serialNumber,
      tidNumber,
      midNumber,
      status: "unassigned",
      franchiseName: "-",
      assignToName: "-",
      assignToId: "-",
      assignToPhone: "-",
      createdAt: new Date().toISOString(),
    };
    inMemoryMachines.unshift(newMachine);
    res.json({ success: true, machine: newMachine });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to register POS machine" });
  }
});

// POST /api/pos/inventory/bulk - Bulk upload POS machines from CSV
router.post("/inventory/bulk", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid or empty machine list" });
    }
    const added: any[] = [];
    for (const item of items) {
      const companyUpper = (item.companyName || "GENERAL").trim().toUpperCase();
      if (!inMemoryCompanies.includes(companyUpper)) {
        inMemoryCompanies.push(companyUpper);
      }
      const newM = {
        id: (inMemoryMachines.length + 1).toString(),
        companyName: companyUpper,
        bankName: item.bankName || "Axis Bank",
        serialNumber: item.serialNumber || `SN-${Date.now()}`,
        tidNumber: item.tidNumber || `TID-${Date.now()}`,
        midNumber: item.midNumber || `MID-${Date.now()}`,
        status: item.status || "unassigned",
        franchiseName: item.franchiseName || "-",
        assignToName: item.assignToName || "-",
        assignToId: item.assignToId || "-",
        assignToPhone: item.assignToPhone || "-",
        createdAt: new Date().toISOString(),
      };
      inMemoryMachines.unshift(newM);
      added.push(newM);
    }
    res.json({ success: true, count: added.length, machines: inMemoryMachines });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed bulk upload" });
  }
});

// PUT /api/pos/inventory/:id - Assign/Edit POS machine
router.put("/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const index = inMemoryMachines.findIndex((m) => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Machine not found" });
    }
    inMemoryMachines[index] = { ...inMemoryMachines[index], ...req.body };
    res.json({ success: true, machine: inMemoryMachines[index] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update machine" });
  }
});

// DELETE /api/pos/inventory/:id - Remove machine
router.delete("/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    inMemoryMachines = inMemoryMachines.filter((m) => m.id !== id);
    res.json({ success: true, message: "Machine deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete machine" });
  }
});

export default router;
