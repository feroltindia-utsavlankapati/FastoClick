import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    username: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                // Use dashboard endpoint to verify user and token since it returns user details
                const response = await fetch('http://localhost:8000/tenant/dashboard', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const json = await response.json();

                if (!response.ok || !json.success) {
                    throw new Error('Invalid token');
                }

                setUser(json.data.user);
            } catch (error) {
                console.error("Token verification failed:", error);
                // Token is invalid or expired
                setToken(null);
                setUser(null);
                localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        // User will be fetched in useEffect due to token dependency
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
