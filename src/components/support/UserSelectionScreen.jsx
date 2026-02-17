import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const pinkVariants = [
  "bg-pink-400",
  "bg-pink-500",
  "bg-rose-400",
  "bg-rose-500",
  "bg-fuchsia-400",
  "bg-fuchsia-500"
];

export default function UserSelectionScreen() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await base44.entities.User.list();
        setUsers(allUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const getInitials = (user) => {
    if (user.email === 'info@pilatesinpinkstudio.com') return 'PI';
    if (user.full_name) {
      const names = user.full_name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (user) => {
    if (user.email === 'info@pilatesinpinkstudio.com') return 'Front Desk';
    if (user.full_name) return user.full_name.split(' ')[0];
    return user.email.split('@')[0];
  };

  const getUserColor = (index) => {
    return pinkVariants[index % pinkVariants.length];
  };

  const handleUserClick = () => {
    base44.auth.redirectToLogin(window.location.pathname);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap');
        .cursive-text {
          font-family: 'Dancing Script', cursive;
        }
      `}</style>
      
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <h1 className="cursive-text text-5xl md:text-6xl text-white mb-16">
          Select User
        </h1>
        
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-4xl">
          {users.length === 0 ? (
            <div className="text-gray-400 text-xl">No users available</div>
          ) : (
            users.map((user, index) => (
            <button
              key={user.id}
              onClick={handleUserClick}
              className="group flex flex-col items-center transition-transform hover:scale-110"
            >
              <div className={`w-32 h-32 md:w-40 md:h-40 ${getUserColor(index)} rounded-2xl flex items-center justify-center shadow-2xl border-4 border-transparent group-hover:border-white transition-all`}>
                <span className="text-white text-4xl md:text-5xl font-bold">
                  {getInitials(user)}
                </span>
              </div>
              <span className="text-gray-300 text-lg md:text-xl mt-4 group-hover:text-white transition-colors">
                {getDisplayName(user)}
              </span>
            </button>
          )))}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 flex flex-col items-center gap-4">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690aaf0c732696417648d224/9fc97775a_PiPSupport.png"
          alt="PiP Support"
          className="w-16 h-16 rounded-2xl shadow-lg"
        />
        <p className="text-gray-500 text-sm">
          © 2026 Pilates in Pink™ • All rights reserved
        </p>
      </div>
    </div>
  );
}