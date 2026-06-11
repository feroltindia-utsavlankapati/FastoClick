import { useState, useEffect } from "react";
import { Users, UploadCloud, Plus, Download, Search, Trash2 } from "lucide-react";
import NavigationBar from "../UI/NavigationBar";

interface Contact {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    company_name: string | null;
    designation: string | null;
    phone_number: string | null;
    is_unsubscribed: boolean;
}

export default function EmailContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8000/email/contacts/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setContacts(data);
            }
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("http://localhost:8000/email/contacts/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                alert("Contacts imported successfully!");
                setFile(null);
                fetchContacts();
            } else {
                const data = await res.json();
                alert(`Error: ${data.detail || "Upload failed"}`);
            }
        } catch (error) {
            console.error("Failed to upload contacts", error);
            alert("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contact?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/email/contacts/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setContacts(contacts.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete contact", error);
        }
    };

    const downloadSample = () => {
        const csvContent = "data:text/csv;charset=utf-8,email,first_name,last_name,company_name,designation,phone_number\nuser@example.com,John,Doe,Acme Corp,CEO,+1234567890";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sample_contacts.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredContacts = contacts.filter(c => 
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            <NavigationBar />
            
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 relative z-10 flex flex-col gap-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                <Users size={24} className="text-[#3B82F6]" />
                            </span>
                            Contact List
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Manage your email recipients and import bulk lists.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Import Section */}
                    <div className="col-span-1 bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <UploadCloud size={20} className="text-primary-600" /> Import Contacts
                        </h2>
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-slate-500">Upload a CSV or Excel file containing your contacts. Ensure there is an 'email' column.</p>
                            
                            <button 
                                onClick={downloadSample}
                                className="text-sm text-primary-600 hover:underline flex items-center gap-1 font-bold w-fit"
                            >
                                <Download size={14} /> Download Sample CSV
                            </button>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 rounded-2xl flex flex-col gap-4">
                                <input 
                                    type="file" 
                                    accept=".csv, .xls, .xlsx"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                    className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-50 file:text-primary-600 file:bg-white border border-slate-200 shadow-sm rounded-xl hover:file:bg-slate-50 border border-slate-200 rounded-xl transition-all"
                                />
                                <button 
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                    className="w-full py-3 rounded-xl inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            <Plus size={18} /> Upload List
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Contacts Table Section */}
                    <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-6 overflow-hidden">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Users size={20} className="text-slate-900" /> Contacts ({filteredContacts.length})
                            </h2>
                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto rounded-2xl bg-slate-50 border border-slate-200 rounded-xl p-2">
                            {loading ? (
                                <div className="h-40 flex items-center justify-center text-slate-500 font-bold">Loading...</div>
                            ) : filteredContacts.length === 0 ? (
                                <div className="h-40 flex items-center justify-center text-slate-500 font-bold">No contacts found.</div>
                            ) : (
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-white/20">
                                            <th className="px-4 py-3 font-bold">Name</th>
                                            <th className="px-4 py-3 font-bold">Email</th>
                                            <th className="px-4 py-3 font-bold">Company</th>
                                            <th className="px-4 py-3 font-bold">Status</th>
                                            <th className="px-4 py-3 font-bold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredContacts.map(c => (
                                            <tr key={c.id} className="border-b border-white/10 hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-900">
                                                    {c.first_name || c.last_name ? `${c.first_name || ""} ${c.last_name || ""}` : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{c.email}</td>
                                                <td className="px-4 py-3 text-slate-500">{c.company_name || "—"}</td>
                                                <td className="px-4 py-3">
                                                    {c.is_unsubscribed ? (
                                                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">Unsubscribed</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-green-100 text-green-600 rounded-lg text-xs font-bold">Active</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        onClick={() => handleDelete(c.id)}
                                                        className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Contact"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
