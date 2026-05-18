function HomePage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
            <div className="p-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">FastoClick</h1>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <img 
                    className="w-full max-w-2xl rounded-2xl shadow-2xl mb-8 object-cover h-64 transition-transform duration-500 hover:scale-[1.02]" 
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                    alt="Hero" 
                />
                <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight">FastoClick</h1>
                <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-xl">AI-powered Digital Marketing</p>
                <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-lg font-semibold hover:scale-105 transition-transform duration-300 shadow-lg shadow-purple-500/30">
                    Get Started
                </button>
            </div>
        </div>
    );
}

export default HomePage;