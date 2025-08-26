import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../AuthContext";
import { X, Users, UserPlus, Share2, Loader2, Building2 } from "lucide-react";

export default function SharePopup({ exam, onClose }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [shareType, setShareType] = useState("friend"); // "friend" or "organization"

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      
      // Load friends
      const { data: friendsData, error: friendsError } = await supabase
        .from("friends")
        .select("friend_id, profiles:friend_id(id, username, firstname, lastname, avatar_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!friendsError) {
        setFriends((friendsData || []).map(r => r.profiles).filter(Boolean));
      }
      
      // Load user's organization
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("organization(id, name)")
        .eq("id", user.id)
        .single();
      if (!profileError && profileData?.organization) {
        setOrganization(profileData.organization);
      }
      
      setLoading(false);
    };
    loadData();
  }, [user]);

  const shareContent = async () => {
    if (!exam?.id) return;
    setBusy(true);
    
    let error;
    if (shareType === "friend") {
      if (!selectedFriend) return;
      const { error: shareError } = await supabase
        .from("exam_shares")
        .insert({ exam_id: exam.id, owner_id: user.id, shared_with_id: selectedFriend });
      error = shareError;
    } else if (shareType === "organization") {
      if (!organization?.id) return;
      const { error: orgError } = await supabase
        .from("org_exam_shares")
        .insert({ exam_id: exam.id, owner_id: user.id, organization_id: organization.id });
      error = orgError;
    }
    
    setBusy(false);
    if (error) {
      alert("Konnte nicht teilen: " + error.message);
      return;
    }
    onClose(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
              <Share2 className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-dark-text">Inhalt teilen</h3>
          </div>
          <button onClick={() => onClose(false)} className="p-2 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-dark-text-secondary">Aktion</label>
            <select 
              value={shareType} 
              onChange={(e) => setShareType(e.target.value)} 
              className="w-full mt-1 border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text"
            >
              <option value="friend">Mit Freunden teilen</option>
              {organization && <option value="organization">Mit Organisation teilen</option>}
            </select>
          </div>

          {shareType === "friend" && (
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-2"><Users className="h-4 w-4" /> Freund auswählen</label>
              {loading ? (
                <div className="mt-2 text-sm text-gray-500">Lade Freunde...</div>
              ) : friends.length === 0 ? (
                <div className="mt-2 text-sm text-gray-500">Keine Freunde gefunden</div>
              ) : (
                <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)} className="w-full mt-2 border rounded-lg px-3 py-2">
                  <option value="">Bitte wählen</option>
                  {friends.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.firstname} {f.lastname} (@{f.username})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {shareType === "organization" && organization && (
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-2"><Building2 className="h-4 w-4" /> Organisation</label>
              <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="text-sm font-medium text-indigo-700">{organization.name}</div>
                <div className="text-xs text-indigo-600">Wird mit allen Mitgliedern geteilt</div>
              </div>
            </div>
          )}

          <button
            onClick={shareContent}
            disabled={(shareType === "friend" && !selectedFriend) || (shareType === "organization" && !organization) || busy}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white ${busy ? 'bg-indigo-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Teilen
          </button>
        </div>
      </div>
    </div>
  );
}




