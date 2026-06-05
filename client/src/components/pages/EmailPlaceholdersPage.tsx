import { Braces, Copy, Code, CheckCircle2, TerminalSquare, Info } from "lucide-react";
import NavigationBar from "../UI/NavigationBar";
import { useState } from "react";

interface Placeholder {
    tag: string;
    description: string;
    example: string;
    category: string;
}

export default function EmailPlaceholdersPage() {
    const [copiedTag, setCopiedTag] = useState<string | null>(null);

    const placeholders: Placeholder[] = [
        {
            category: "Contact Information",
            tag: "{{first_name}}",
            description: "The recipient's first name. Falls back to a blank space if not provided.",
            example: "Hi {{first_name}}, welcome aboard!"
        },
        {
            category: "Contact Information",
            tag: "{{last_name}}",
            description: "The recipient's last name.",
            example: "Dear Mr. {{last_name}},"
        },
        {
            category: "Contact Information",
            tag: "{{email}}",
            description: "The recipient's exact email address.",
            example: "We sent a confirmation to {{email}}."
        },
        {
            category: "Professional Details",
            tag: "{{company_name}}",
            description: "The name of the recipient's company.",
            example: "How are things at {{company_name}}?"
        },
        {
            category: "Professional Details",
            tag: "{{designation}}",
            description: "The recipient's job title or role.",
            example: "As a {{designation}}, you might find this useful."
        },
        {
            category: "Professional Details",
            tag: "{{phone_number}}",
            description: "The recipient's phone number.",
            example: "We will call you at {{phone_number}}."
        }
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTag(text);
        setTimeout(() => setCopiedTag(null), 2000);
    };

    return (
        <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans flex flex-col">
            <NavigationBar />
            
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 relative z-10 flex flex-col gap-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl soft-inset flex items-center justify-center">
                                <Braces size={24} className="text-[#8B5CF6]" />
                            </span>
                            Template Placeholders
                        </h1>
                        <p className="text-[#6B7280] mt-2 font-medium">Use these dynamic variables to personalize your automated emails.</p>
                    </div>
                </header>

                <div className="soft-extruded rounded-[32px] p-8 mb-4 border-l-4 border-[#8B5CF6] flex gap-4">
                    <Info size={24} className="text-[#8B5CF6] shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-lg mb-2">How it works</h3>
                        <p className="text-[#6B7280] text-sm leading-relaxed">
                            Placeholders allow you to inject specific contact data directly into your email templates. 
                            When a campaign is sent, the system will automatically replace the <code>{'{{tag}}'}</code> with 
                            the actual information from your Contacts list. If a contact is missing that specific data (like a company name), 
                            it will simply be left blank.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Placeholder Dictionary */}
                    <div className="soft-extruded rounded-[32px] p-8 flex flex-col gap-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <Code size={20} className="text-[#8B5CF6]" /> Available Variables
                        </h2>
                        
                        <div className="flex flex-col gap-4">
                            {placeholders.map((ph, idx) => (
                                <div key={idx} className="soft-inset p-5 rounded-2xl flex flex-col gap-3 group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <code className="px-3 py-1 bg-[#8B5CF6]/10 text-[#8B5CF6] font-mono font-bold rounded-lg text-sm border border-[#8B5CF6]/20">
                                                {ph.tag}
                                            </code>
                                            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider ml-2">{ph.category}</span>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(ph.tag)}
                                            className="p-2 rounded-lg text-[#6B7280] hover:bg-white hover:shadow-sm transition-all"
                                            title="Copy to clipboard"
                                        >
                                            {copiedTag === ph.tag ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-sm font-medium text-[#3D4852]">{ph.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Example Usage */}
                    <div className="soft-extruded rounded-[32px] p-8 flex flex-col gap-6 h-fit">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <TerminalSquare size={20} className="text-[#10B981]" /> Example Usage
                        </h2>
                        
                        <div className="bg-[#1e293b] text-gray-300 p-6 rounded-2xl font-mono text-sm leading-relaxed shadow-inner overflow-x-auto">
                            <div className="text-green-400 mb-4 font-bold">// Email HTML Template</div>
                            
                            <div className="mb-2 text-white font-bold">&lt;h1&gt;Hi {'{{first_name}}'},&lt;/h1&gt;</div>
                            
                            <div className="mb-4 text-gray-400">
                                &lt;p&gt;We noticed that things are growing fast at &lt;strong&gt;{'{{company_name}}'}&lt;/strong&gt;.&lt;/p&gt;
                            </div>
                            
                            <div className="mb-4 text-gray-400">
                                &lt;p&gt;As a &lt;strong&gt;{'{{designation}}'}&lt;/strong&gt;, you probably need a tool that can keep up with your marketing demands.&lt;/p&gt;
                            </div>
                            
                            <div className="text-gray-400">
                                &lt;p&gt;We will reach out to you at &lt;strong&gt;{'{{phone_number}}'}&lt;/strong&gt; soon!&lt;/p&gt;
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl border-2 border-dashed border-[#A0AEC0] flex flex-col gap-4 bg-white/30">
                            <div className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">How the recipient sees it:</div>
                            <div className="text-[#3D4852]">
                                <h1 className="text-2xl font-bold mb-2">Hi John,</h1>
                                <p className="mb-2">We noticed that things are growing fast at <strong>Acme Corp</strong>.</p>
                                <p className="mb-2">As a <strong>Marketing Director</strong>, you probably need a tool that can keep up with your marketing demands.</p>
                                <p>We will reach out to you at <strong>+1234567890</strong> soon!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
