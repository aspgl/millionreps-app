import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "./lib/supabase";
import { Users, UserPlus, UserMinus, Check, X, Search, Mail } from "lucide-react";

export default function Network() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("friends"); // friends | requests | discover
  const [actionLoading, setActionLoading] = useState({ accept: new Set(), reject: new Set(), add: new Set(), remove: new Set() });

  const isSelf = (profileId) => user?.id === profileId;

  const refreshAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Friends: assuming a table `friends` with rows for both directions (user_id, friend_id)
      const { data: friendRows, error: friendErr } = await supabase
        .from("friends")
        .select("friend_id, profiles:friend_id(id, username, firstname, lastname, avatar_url, organization(name))")
        .eq("user_id", user.id);
      if (friendErr) throw friendErr;

      setFriends((friendRows || []).map(r => ({
        id: r.profiles?.id,
        username: r.profiles?.username,
        firstname: r.profiles?.firstname,
        lastname: r.profiles?.lastname,
        avatar_url: r.profiles?.avatar_url,
        organization: r.profiles?.organization?.name || null,
      })).filter(f => !!f.id));

      // Requests: incoming pending
      const { data: incomingRows, error: incErr } = await supabase
        .from("friend_requests")
        .select("id, sender_id, status, created_at, sender:sender_id(id, username, firstname, lastname, avatar_url, organization(name))")
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (incErr) throw incErr;
      setIncoming((incomingRows || []).map(r => ({
        id: r.id,
        sender_id: r.sender_id,
        status: r.status,
        created_at: r.created_at,
        profile: {
          id: r.sender?.id,
          username: r.sender?.username,
          firstname: r.sender?.firstname,
          lastname: r.sender?.lastname,
          avatar_url: r.sender?.avatar_url,
          organization: r.sender?.organization?.name || null,
        },
      })));

      // Requests: outgoing pending
      const { data: outgoingRows, error: outErr } = await supabase
        .from("friend_requests")
        .select("id, receiver_id, status, created_at, receiver:receiver_id(id, username, firstname, lastname, avatar_url, organization(name))")
        .eq("sender_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (outErr) throw outErr;
      setOutgoing((outgoingRows || []).map(r => ({
        id: r.id,
        receiver_id: r.receiver_id,
        status: r.status,
        created_at: r.created_at,
        profile: {
          id: r.receiver?.id,
          username: r.receiver?.username,
          firstname: r.receiver?.firstname,
          lastname: r.receiver?.lastname,
          avatar_url: r.receiver?.avatar_url,
          organization: r.receiver?.organization?.name || null,
        },
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // relation helpers
  const getRelationStatus = (targetUserId) => {
    if (!targetUserId) return "none";
    if (isSelf(targetUserId)) return "self";
    if (friends.some(f => f.id === targetUserId)) return "friend";
    if (incoming.some(r => r.profile.id === targetUserId)) return "incoming";
    if (outgoing.some(r => r.profile.id === targetUserId)) return "outgoing";
    return "none";
  };

  // debounced multi-field search
  useEffect(() => {
    let timer;
    const run = async () => {
      const q = (search || "").trim();
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, firstname, lastname, avatar_url, organization(name)")
        .or(`username.ilike.%${q}%,firstname.ilike.%${q}%,lastname.ilike.%${q}%`)
        .limit(20);
      if (error) return;
      const filtered = (data || []).filter(p => p.id !== user?.id);
      setSearchResults(filtered);
    };
    timer = setTimeout(run, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  const sendRequest = async (targetUserId) => {
    if (!targetUserId || isSelf(targetUserId)) return;
    // Avoid duplicates: if already friends or pending, ignore
    const alreadyFriend = friends.some(f => f.id === targetUserId);
    const pendingOut = outgoing.some(o => o.profile.id === targetUserId);
    if (alreadyFriend || pendingOut) return;
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_id: targetUserId, status: "pending" });
    if (!error) {
      await refreshAll();
    }
  };

  const acceptRequest = async (requestId, _senderId) => {
    setActionLoading(prev => ({ ...prev, accept: new Set(prev.accept).add(requestId) }));
    const { error } = await supabase.rpc('accept_friend_request', { p_request_id: requestId });
    if (error) {
      setActionLoading(prev => { const s = new Set(prev.accept); s.delete(requestId); return { ...prev, accept: s }; });
      alert("Anfrage konnte nicht angenommen werden.");
      return;
    }
    await refreshAll();
    setActionLoading(prev => { const s = new Set(prev.accept); s.delete(requestId); return { ...prev, accept: s }; });
  };

  const rejectRequest = async (requestId) => {
    setActionLoading(prev => ({ ...prev, reject: new Set(prev.reject).add(requestId) }));
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);
    if (!error) await refreshAll();
    setActionLoading(prev => { const s = new Set(prev.reject); s.delete(requestId); return { ...prev, reject: s }; });
  };

  const removeFriend = async (friendId) => {
    if (!friendId) return;
    setActionLoading(prev => ({ ...prev, remove: new Set(prev.remove).add(friendId) }));
    const { error } = await supabase.rpc('remove_friendship', { p_user_id: user.id, p_friend_id: friendId });
    if (error) alert('Konnte Freundschaft nicht entfernen.');
    await refreshAll();
    setActionLoading(prev => { const s = new Set(prev.remove); s.delete(friendId); return { ...prev, remove: s }; });
  };

  const SectionCard = ({ title, icon: Icon, children, actions }) => (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div className="relative px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-60" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );

  const UserRow = ({ p, trailing }) => (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <img src={p.avatar_url || `https://i.pravatar.cc/80?u=${p.id}`} alt={p.username} className="h-10 w-10 rounded-full ring-2 ring-white shadow" />
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{p.firstname} {p.lastname}</div>
          <div className="text-xs text-gray-500 truncate">@{p.username}{p.organization ? ` • ${p.organization}` : ""}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">{trailing}</div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👥 Netzwerk</h1>
            <p className="text-gray-600">Freunde anzeigen, hinzufügen und Organisationen überblicken</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
            {["friends","requests","discover"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  activeTab === tab ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab === "friends" ? "Freunde" : tab === "requests" ? "Anfragen" : "Entdecken"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "friends" && (
        <SectionCard title="Deine Freunde" icon={Users}>
          {loading ? (
            <div className="text-gray-500">Lade...</div>
          ) : friends.length === 0 ? (
            <div className="text-gray-500">Noch keine Freunde. Wechsle zu Entdecken, um welche hinzuzufügen.</div>
          ) : (
            <div className="space-y-2">
              {friends.map(f => (
                <UserRow key={f.id} p={f} trailing={
                  <>
                    <button disabled={actionLoading.remove.has(f.id)} onClick={() => removeFriend(f.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border ${actionLoading.remove.has(f.id) ? "border-gray-200 text-gray-400" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                      <UserMinus className="h-4 w-4" /> Entfernen
                    </button>
                  </>
                } />
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === "requests" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <SectionCard title="Eingehende Anfragen" icon={Mail}>
            {incoming.length === 0 ? (
              <div className="text-gray-500">Keine offenen Anfragen</div>
            ) : (
              <div className="space-y-2">
                {incoming.map(r => (
                  <UserRow key={r.id} p={r.profile} trailing={
                    <>
                      <button disabled={actionLoading.accept.has(r.id)} onClick={() => acceptRequest(r.id, r.sender_id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border ${actionLoading.accept.has(r.id) ? "border-green-100 text-green-300" : "border-green-200 text-green-700 hover:bg-green-50"}`}>
                        <Check className="h-4 w-4" /> Annehmen
                      </button>
                      <button disabled={actionLoading.reject.has(r.id)} onClick={() => rejectRequest(r.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border ${actionLoading.reject.has(r.id) ? "border-red-100 text-red-300" : "border-red-200 text-red-700 hover:bg-red-50"}`}>
                        <X className="h-4 w-4" /> Ablehnen
                      </button>
                    </>
                  } />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Ausgehende Anfragen" icon={Mail}>
            {outgoing.length === 0 ? (
              <div className="text-gray-500">Keine ausstehenden Anfragen</div>
            ) : (
              <div className="space-y-2">
                {outgoing.map(r => (
                  <UserRow key={r.id} p={r.profile} trailing={<span className="text-sm text-gray-500">Ausstehend</span>} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === "discover" && (
        <SectionCard title="Freunde finden" icon={UserPlus} actions={
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Suche nach Benutzernamen"
              className="outline-none text-sm w-48"
            />
          </div>
        }>
          {searchResults.length === 0 ? (
            <div className="text-gray-500">Suche nach Benutzer:innen, um eine Freundschaftsanfrage zu senden.</div>
          ) : (
            <div className="space-y-2">
              {searchResults.map(p => (
                <UserRow key={p.id} p={p} trailing={(() => {
                  const status = getRelationStatus(p.id);
                  if (status === "self") return <span className="text-sm text-gray-400">Du</span>;
                  if (status === "friend") return <span className="text-sm text-green-700 border border-green-200 px-2 py-1 rounded-md">Freund:in</span>;
                  if (status === "outgoing") return <span className="text-sm text-gray-500">Ausstehend</span>;
                  if (status === "incoming") return (
                    <>
                      <button onClick={() => {
                        const req = incoming.find(r => r.profile.id === p.id);
                        if (req) acceptRequest(req.id, req.sender_id);
                      }} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border border-green-200 text-green-700 hover:bg-green-50">
                        <Check className="h-4 w-4" /> Annehmen
                      </button>
                      <button onClick={() => {
                        const req = incoming.find(r => r.profile.id === p.id);
                        if (req) rejectRequest(req.id);
                      }} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border border-red-200 text-red-700 hover:bg-red-50">
                        <X className="h-4 w-4" /> Ablehnen
                      </button>
                    </>
                  );
                  return (
                    <button disabled={actionLoading.add.has(p.id)} onClick={() => {
                      setActionLoading(prev => ({ ...prev, add: new Set(prev.add).add(p.id) }));
                      sendRequest(p.id).finally(() => setActionLoading(prev => { const s = new Set(prev.add); s.delete(p.id); return { ...prev, add: s }; }));
                    }} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm border ${actionLoading.add.has(p.id) ? "border-indigo-100 text-indigo-300" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}`}>
                      <UserPlus className="h-4 w-4" /> Anfragen
                    </button>
                  );
                })()} />
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}


