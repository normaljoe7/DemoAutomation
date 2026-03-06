"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Users,
    Plus,
    Building,
    Mail,
    Phone,
    Search,
    Edit,
    Trash2,
    Loader2,
    RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Client {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    lead_status: string;
    legalName?: string;
    gstNumber?: string;
    registeredAddress?: string;
    contactPerson?: string;
    lastContact?: string;
}

function statusColor(status: string) {
    if (status === "HOT") return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    if (status === "WARM") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (status === "COLD") return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    return "bg-zinc-800 text-zinc-500 border-zinc-700";
}

const emptyForm = {
    name: "", company: "", email: "", phone: "",
    legalName: "", gstNumber: "", registeredAddress: "", contactPerson: "",
};

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);

    const loadClients = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/v1/leads`);
            if (!res.ok) throw new Error("Failed to fetch");
            const leads = await res.json();
            setClients(leads.map((l: any) => ({
                id: l.id,
                name: l.name || "(No name)",
                company: l.company || "",
                email: l.email || "",
                phone: l.phone || "",
                lead_status: l.lead_status || "NOT CLASSIFIED",
                legalName: l.legal_name,
                gstNumber: l.gst_number,
                registeredAddress: l.registered_address,
                contactPerson: l.contact_person,
                lastContact: l.last_contact,
            })));
        } catch {
            // keep empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadClients(); }, []);

    const filtered = clients.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async () => {
        if (!form.name || !form.email) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/v1/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    company: form.company,
                    phone: form.phone,
                    legal_name: form.legalName || null,
                    gst_number: form.gstNumber || null,
                    registered_address: form.registeredAddress || null,
                    contact_person: form.contactPerson || null,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            setAddOpen(false);
            setForm({ ...emptyForm });
            await loadClients();
        } catch {
            alert("Failed to add client. Is the backend running?");
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (c: Client) => {
        setEditingId(c.id);
        setForm({
            name: c.name,
            company: c.company,
            email: c.email,
            phone: c.phone,
            legalName: c.legalName || "",
            gstNumber: c.gstNumber || "",
            registeredAddress: c.registeredAddress || "",
            contactPerson: c.contactPerson || "",
        });
        setEditOpen(true);
    };

    const handleEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/v1/leads/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    company: form.company,
                    phone: form.phone,
                    legal_name: form.legalName || null,
                    gst_number: form.gstNumber || null,
                    registered_address: form.registeredAddress || null,
                    contact_person: form.contactPerson || null,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            setEditOpen(false);
            setEditingId(null);
            setForm({ ...emptyForm });
            await loadClients();
        } catch {
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`${API}/api/v1/leads/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            setDeleteConfirmId(null);
            await loadClients();
        } catch {
            alert("Failed to delete client.");
        }
    };

    const ClientFormFields = () => (
        <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
                <div>
                    <Label className="text-zinc-400 text-xs">Full Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                    <Label className="text-zinc-400 text-xs">Email *</Label>
                    <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                    <Label className="text-zinc-400 text-xs">Company</Label>
                    <Input value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                    <Label className="text-zinc-400 text-xs">Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <Label className="text-zinc-400 text-xs">Legal Company Name</Label>
                    <Input value={form.legalName} onChange={(e) => setForm(f => ({ ...f, legalName: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                    <Label className="text-zinc-400 text-xs">GST Number</Label>
                    <Input value={form.gstNumber} onChange={(e) => setForm(f => ({ ...f, gstNumber: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                    <Label className="text-zinc-400 text-xs">Registered Address</Label>
                    <Input value={form.registeredAddress} onChange={(e) => setForm(f => ({ ...f, registeredAddress: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                    <Label className="text-zinc-400 text-xs">Contact Person</Label>
                    <Input value={form.contactPerson} onChange={(e) => setForm(f => ({ ...f, contactPerson: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full">
            <Header title="Clients" subtitle="Sourced from leads — all data persists in the database." badgeText={`${clients.length} Clients`} />

            <div className="flex-1 p-8 pt-6 overflow-y-auto">
                {/* Search & Add */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Search clients..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                        />
                    </div>
                    <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white" onClick={loadClients} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setForm({ ...emptyForm }); setAddOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />Add Client
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-zinc-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading clients...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                        <Users className="w-10 h-10 mb-3" />
                        <p className="text-sm font-medium">No clients found</p>
                        <p className="text-xs mt-1">Add clients or they will appear here once leads are created on the Leads page.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((client) => (
                            <div key={client.id} className="p-5 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] hover:border-zinc-700/80 transition-all group shadow-lg">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-400">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{client.name}</p>
                                            <p className="text-xs text-zinc-500 flex items-center gap-1"><Building className="w-3 h-3" />{client.company || "—"}</p>
                                        </div>
                                    </div>
                                    <Badge className={`text-[9px] uppercase tracking-wider rounded-sm px-1.5 shadow-none border ${statusColor(client.lead_status)}`}>
                                        {client.lead_status}
                                    </Badge>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <p className="text-xs text-zinc-400 flex items-center gap-2"><Mail className="w-3 h-3 text-zinc-500" />{client.email}</p>
                                    {client.phone && <p className="text-xs text-zinc-400 flex items-center gap-2"><Phone className="w-3 h-3 text-zinc-500" />{client.phone}</p>}
                                    {client.legalName && <p className="text-[11px] text-zinc-500 mt-1 truncate">Legal: {client.legalName}</p>}
                                    {client.contactPerson && <p className="text-[11px] text-zinc-500 truncate">Contact: {client.contactPerson}</p>}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                                    <p className="text-xs text-zinc-600">
                                        {client.lastContact ? `Last: ${new Date(client.lastContact).toLocaleDateString()}` : "No contact yet"}
                                    </p>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 text-zinc-500 hover:text-white"
                                            onClick={() => openEdit(client)}
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 text-zinc-500 hover:text-rose-400"
                                            onClick={() => setDeleteConfirmId(client.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Client Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add New Client</DialogTitle>
                        <DialogDescription className="text-zinc-400">This will create a new lead record in the database.</DialogDescription>
                    </DialogHeader>
                    <ClientFormFields />
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!form.name || !form.email || saving} onClick={handleAdd}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Add Client
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Client Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Client</DialogTitle>
                        <DialogDescription className="text-zinc-400">Changes are saved to the database immediately.</DialogDescription>
                    </DialogHeader>
                    <ClientFormFields />
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!form.name || !form.email || saving} onClick={handleEdit}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Client?</DialogTitle>
                        <DialogDescription className="text-zinc-400">This will permanently delete this lead record from the database. This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
