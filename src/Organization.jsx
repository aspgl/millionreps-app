import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "./lib/supabase";
import { useNavigate } from "react-router-dom";
import { Users, Share2, Building2, Search, Plus, BookOpen, Crown, UserPlus, User } from "lucide-react";

export default function Organization() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [shared, setShared] = useState([]);
  const [filteredShared, setFilteredShared] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("overview"); // overview | shared | members
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      // load user profile with organization
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, firstname, lastname, username, organization(id, name)")
        .eq("id", user.id)
        .single();
      if (!prof?.organization?.id) {
        setOrg(null);
        setLoading(false);
        return;
      }
      setOrg(prof.organization);

      // members: all profiles under org
      const { data: mem } = await supabase
        .from("profiles")
        .select("id, username, firstname, lastname, avatar_url")
        .eq("organization", prof.organization.id);
      setMembers(mem || []);

      // shared learnings with organization - erstmal ohne Join testen
      const { data: rows, error } = await supabase
        .from("org_exam_shares")
        .select("*")
        .eq("organization_id", prof.organization.id)
        .order("created_at", { ascending: false });
      
      console.log("Org shares data (without join):", rows);
      console.log("Org shares error:", error);
      
      // Dann mit Join testen - aber erstmal ohne RLS für exams
      const { data: rowsWithJoin, error: joinError } = await supabase
        .from("org_exam_shares")
        .select(`
          created_at, 
          exam_id,
          owner_id,
          exams(*), 
          owner:profiles!owner_id(id, username, firstname, lastname)
        `)
        .eq("organization_id", prof.organization.id)
        .order("created_at", { ascending: false });
      
      console.log("Org shares data (with join):", rowsWithJoin);
      console.log("Org shares join error:", joinError);
      
      // Debug: Prüfe ob exams Daten haben
      if (rowsWithJoin && rowsWithJoin.length > 0) {
        console.log("First row exams:", rowsWithJoin[0].exams);
        console.log("First row owner:", rowsWithJoin[0].owner);
        console.log("First row exam_id:", rowsWithJoin[0].exam_id);
        console.log("User ID:", user.id);
        console.log("Organization ID:", prof.organization.id);
      }
      
      // Debug: Teste direkten Zugriff auf exams
      if (rows && rows.length > 0) {
        console.log("Exam ID to test:", rows[0].exam_id);
        const { data: examTest, error: examError } = await supabase
          .from("exams")
          .select("*")
          .eq("id", rows[0].exam_id)
          .single();
        console.log("Direct exam access:", examTest);
        console.log("Direct exam error:", examError);
      }
      
      // Lade exams über exam_id
      if (rows && rows.length > 0) {
        console.log("Org shares rows:", rows);
        
        // Für jeden org_exam_shares Eintrag den Titel aus exams holen
        const examPromises = rows.map(async (share) => {
          console.log(`Trying to load exam with ID: ${share.exam_id}`);
          
          // Teste erstmal einen einfachen Select
          const { data: exam, error } = await supabase
            .from("exams")
            .select("*")
            .eq("id", share.exam_id)
            .single();
          
          console.log(`Exam for ${share.exam_id}:`, exam);
          console.log(`Error for ${share.exam_id}:`, error);
          
          // Falls es funktioniert, erstelle ein einfaches Objekt
          const examData = exam ? {
            id: exam.id,
            title: exam.title,
            description: exam.description
          } : null;
          
          return {
            ...share,
            exams: examData
          };
        });
        
        const combinedData = await Promise.all(examPromises);
        console.log("Combined data:", combinedData);
        console.log("First item exams:", combinedData[0]?.exams);
        console.log("First item title:", combinedData[0]?.exams?.title);
        console.log("Setting shared state with:", combinedData);
        setShared(combinedData);
        setFilteredShared(combinedData);
      } else {
        setShared(rowsWithJoin || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Filter shared content based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredShared(shared);
    } else {
      const filtered = shared.filter(item => 
        item.exams?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.exams?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${item.owner?.firstname} ${item.owner?.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredShared(filtered);
    }
  }, [searchTerm, shared]);

  if (loading) return <div className="p-6">Lade Organisation...</div>;
  if (!org) return <div className="p-6">Keine Organisation verknüpft.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-white">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{org.name}</h1>
                <p className="text-gray-600">Dein Organisations-Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                <UserPlus className="h-4 w-4" /> Mitglieder einladen
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1 w-full sm:w-auto">
            {["overview","shared","members"].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${tab===t? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow':'text-gray-700 hover:bg-gray-50'}`}>
                {t === 'overview' ? 'Übersicht' : t === 'shared' ? 'Geteilte Inhalte' : 'Mitglieder'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Neueste geteilte Inhalte</h2>
              <div className="text-sm text-gray-500">{shared.length} gesamt</div>
            </div>
            <div className="divide-y divide-gray-100">
              {shared.slice(0,6).map((row) => (
                <div key={`${row.exams?.id}-${row.created_at}`} className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">{row.exams?.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      von {row.owner?.firstname} {row.owner?.lastname} • {new Date(row.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs rounded-full bg-indigo-600 text-white hover:bg-indigo-700">Öffnen</button>
                </div>
              ))}
              {shared.length === 0 && (
                <div className="text-sm text-gray-500">Noch keine geteilten Inhalte</div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mitglieder</h2>
            <div className="space-y-3">
              {members.slice(0,8).map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <img src={m.avatar_url || `https://i.pravatar.cc/80?u=${m.id}`} className="h-8 w-8 rounded-full" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.firstname} {m.lastname}</div>
                    <div className="text-xs text-gray-500 truncate">@{m.username}</div>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="text-sm text-gray-500">Noch keine Mitglieder</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'shared' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">Geteilte Inhalte</p>
                  <p className="text-2xl font-bold text-indigo-900">{shared.length}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <BookOpen className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Durchgeführt</p>
                  <p className="text-2xl font-bold text-green-900">0</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <div className="h-6 w-6 text-green-600">📊</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Durchschnitt</p>
                  <p className="text-2xl font-bold text-orange-900">0%</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <div className="h-6 w-6 text-orange-600">🎯</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Alle geteilten Inhalte</h2>
                <p className="text-sm text-gray-500 mt-1">Übe und verbessere deine Fähigkeiten</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input 
                    placeholder="Suchen..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="outline-none text-sm bg-transparent" 
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-3 font-medium">Titel</th>
                    <th className="py-3 font-medium">Erstellt von</th>
                    <th className="py-3 font-medium">Datum</th>
                    <th className="py-3 font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShared.map(r => (
                    <tr key={`${r.exam_id}-${r.created_at}`} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4">
                        <div>
                          <div className="font-medium text-gray-900">{r.exams?.title || `No title (exam_id: ${r.exam_id})`}</div>
                          <div className="text-xs text-gray-500 mt-1">{r.exams?.description}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="text-gray-700">{r.owner?.firstname} {r.owner?.lastname}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-4">
                        <button 
                          onClick={() => navigate(`/klausur/ueben/${r.exam_id}`)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
                        >
                          <BookOpen className="h-4 w-4" />
                          Üben
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredShared.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-gray-500" colSpan={4}>
                        <div className="flex flex-col items-center gap-2">
                          <BookOpen className="h-8 w-8 text-gray-300" />
                          <p>
                            {searchTerm ? 'Keine Ergebnisse gefunden' : 'Noch keine geteilten Inhalte'}
                          </p>
                          <p className="text-xs">
                            {searchTerm ? 'Versuche andere Suchbegriffe' : 'Sobald Inhalte geteilt werden, erscheinen sie hier'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mitglieder</h2>
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm">
              <UserPlus className="h-4 w-4" /> Hinzufügen
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200">
                <img src={m.avatar_url || `https://i.pravatar.cc/80?u=${m.id}`} className="h-10 w-10 rounded-full" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{m.firstname} {m.lastname}</div>
                  <div className="text-xs text-gray-500 truncate">@{m.username}</div>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="text-sm text-gray-500">Noch keine Mitglieder</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


