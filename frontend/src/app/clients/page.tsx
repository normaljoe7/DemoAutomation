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
    FileText,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
} from "lucide-react";
import { useState } from "react";

interface Client {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    industry: string;
    totalCalls: number;
    totalDocs: number;
    lastContact: string;
    status: "active" | "inactive";
    legalName?: string;
    gstNumber?: string;
    registeredAddress?: string;
    contactPerson?: string;
}

const mockClients: Client[] = [
    { id: "c1", name: "Kristen Hayer", company: "Stark Industries", email: "kristen.hayer@stark.com", phone: "+1 415-555-0123", industry: "Defense & Tech", totalCalls: 8, totalDocs: 12, lastContact: "Mar 4, 2026", status: "active", legalName: "Stark Industries LLC", gstNumber: "27AAACS1234A1Z1", registeredAddress: "123 Rocket Way, Malibu", contactPerson: "Happy Hogan" },
    { id: "c2", name: "Tony Stark", company: "Avengers Initiative", email: "tonystark@avengers.io", phone: "+1 212-555-9876", industry: "Security", totalCalls: 3, totalDocs: 5, lastContact: "Mar 3, 2026", status: "active" },
    { id: "c3", name: "Pepper Potts", company: "Stark Industries", email: "ppotts@stark.com", phone: "+1 415-555-0124", industry: "Defense & Tech", totalCalls: 5, totalDocs: 8, lastContact: "Mar 2, 2026", status: "active" },
    { id: "c4", name: "Trishala V", company: "Silver Corp", email: "trishasilver12@gmail.com", phone: "+91 6362664320", industry: "Software", totalCalls: 2, totalDocs: 3, lastContact: "Feb 28, 2026", status: "active" },
    { id: "c5", name: "Natasha R.", company: "SHIELD Global", email: "natasha@shield.org", phone: "+1 202-555-3344", industry: "Government", totalCalls: 1, totalDocs: 0, lastContact: "Feb 25, 2026", status: "inactive" },
];

export default function ClientsPage() {
    const [clients, setClients] = useState(mockClients);
    const [search, setSearch] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCompany, setNewCompany] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newLegalName, setNewLegalName] = useState("");
    const [newGST, setNewGST] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [newContactPerson, setNewContactPerson] = useState("");

    const filtered = clients.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = () => {
        const newClient: Client = {
            id: `c${clients.length + 1}`,
            name: newName,
            company: newCompany,
            email: newEmail,
            phone: newPhone,
            industry: "Other",
            totalCalls: 0,
            totalDocs: 0,
            lastContact: "Today",
            status: "active",
            legalName: newLegalName || undefined,
            gstNumber: newGST || undefined,
            registeredAddress: newAddress || undefined,
            contactPerson: newContactPerson || undefined,
        };
        setClients([newClient, ...clients]);
        setAddOpen(false);
        setNewName(""); setNewCompany(""); setNewEmail(""); setNewPhone("");
        setNewLegalName(""); setNewGST(""); setNewAddress(""); setNewContactPerson("");
    };

    return (
        <div className="flex flex-col h-full w-full">
            <Header title="Clients" subtitle="Manage leads, customers, and organization structures." badgeText={`${clients.length} Clients`} />

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
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setAddOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />Add Client
                    </Button>
                </div>

                {/* Client Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((client) => (
                        <div key={client.id} className="p-5 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] hover:border-zinc-700/80 transition-all group shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-400">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{client.name}</p>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1"><Building className="w-3 h-3" />{client.company}</p>
                                    </div>
                                </div>
                                <Badge className={`text-[9px] uppercase tracking-wider rounded-sm px-1.5 shadow-none border ${client.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
                                    {client.status}
                                </Badge>
                            </div>

                            <div className="space-y-2 mb-4">
                                <p className="text-xs text-zinc-400 flex items-center gap-2"><Mail className="w-3 h-3 text-zinc-500" />{client.email}</p>
                                <p className="text-xs text-zinc-400 flex items-center gap-2"><Phone className="w-3 h-3 text-zinc-500" />{client.phone}</p>
                                {client.legalName && <p className="text-[11px] text-zinc-500 mt-1 truncate">Legal: {client.legalName}</p>}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                                <div className="flex gap-4 text-xs text-zinc-500">
                                    <span>{client.totalCalls} calls</span>
                                    <span>{client.totalDocs} docs</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white"><Edit className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Client Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add New Client</DialogTitle>
                        <DialogDescription className="text-zinc-400">Enter the client information below. Basic fields are required, others are optional.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-4">
                            <div><Label className="text-zinc-400 text-xs">Full Name *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                            <div><Label className="text-zinc-400 text-xs">Email *</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                            <div><Label className="text-zinc-400 text-xs">Company *</Label><Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                            <div><Label className="text-zinc-400 text-xs">Phone</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                        </div>
                        <div className="space-y-4">
                            <div><Label className="text-zinc-400 text-xs">Legal Company Name (Optional)</Label><Input value={newLegalName} onChange={(e) => setNewLegalName(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                            <div><Label className="text-zinc-400 text-xs">GST Number (Optional)</Label><Input value={newGST} onChange={(e) => setNewGST(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                            <div><Label className="text-zinc-400 text-xs">Registered Address (Optional)</Label><Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                            <div><Label className="text-zinc-400 text-xs">Contact Person (Optional)</Label><Input value={newContactPerson} onChange={(e) => setNewContactPerson(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!newName || !newEmail || !newCompany} onClick={handleAdd}>Add Client</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
