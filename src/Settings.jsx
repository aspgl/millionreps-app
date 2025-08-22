import { useAuth } from "./AuthContext";
import { supabase } from "./lib/supabase";
import { useEffect, useState } from "react";
import { resizeImage } from "./utils/image"; // Image Resize Funktion

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    avatar_url: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lade Userdaten inkl. avatar_url
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("firstname, lastname, username, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm({
              firstname: data.firstname,
              lastname: data.lastname,
              username: data.username,
              email: user.email,
              avatar_url: data.avatar_url || "",
            });
          }
        });
    }
  }, [user]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        firstname: form.firstname,
        lastname: form.lastname,
        username: form.username,
      })
      .eq("id", user.id);

    if (error) alert(error.message);
    else alert("Profil gespeichert ✅");
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;
    setLoading(true);

    try {
      // Validiere Dateityp
      if (!avatarFile.type.startsWith('image/')) {
        throw new Error('Bitte wähle eine Bilddatei aus');
      }

      // Validiere Dateigröße (max 5MB)
      if (avatarFile.size > 5 * 1024 * 1024) {
        throw new Error('Datei ist zu groß (max 5MB)');
      }

      const blob = await resizeImage(avatarFile, 400, 400);
      const filePath = `${user.id}/avatar.jpg`;

      // Lösche altes Avatar falls vorhanden
      try {
        await supabase.storage
          .from("avatars")
          .remove([filePath]);
      } catch (error) {
        // Ignoriere Fehler beim Löschen (Datei existiert möglicherweise nicht)
      }

      // Upload neues Avatar
      const { error: uploadError, data } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          upsert: true,
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Upload Error:", uploadError);
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      // Hole öffentliche URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update Profil in der Datenbank
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (dbError) {
        console.error("Database Error:", dbError);
        throw new Error(`Datenbankfehler: ${dbError.message}`);
      }

      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      alert("Profilbild erfolgreich hochgeladen ✅");
    } catch (err) {
      console.error("Avatar Upload Error:", err);
      alert(`Fehler beim Hochladen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto rounded-xl bg-white p-6 shadow">
      <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vorname
            </label>
            <input
              name="firstname"
              value={form.firstname}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nachname
            </label>
            <input
              name="lastname"
              value={form.lastname}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email (nicht änderbar)
          </label>
          <input
            value={form.email}
            disabled
            className="mt-1 w-full rounded-lg border px-3 py-2 bg-gray-100 text-gray-500"
          />
        </div>

        {/* Profilbild Vorschau + Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profilbild
          </label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={form.avatar_url || "https://i.pravatar.cc/100?u=default"}
                alt="Profilbild"
                className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
              />
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files[0])}
                    className="hidden"
                  />
                  📁 Datei auswählen
                </label>
                
                {avatarFile && (
                  <span className="text-sm text-gray-600">
                    {avatarFile.name}
                  </span>
                )}
              </div>
              
              {avatarFile && (
                <button
                  type="button"
                  onClick={handleUploadAvatar}
                  disabled={loading}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      📤 Hochladen
                    </>
                  )}
                </button>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                Unterstützte Formate: JPG, PNG, GIF (max 5MB)
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Speichern
        </button>
      </form>
    </div>
  );
}
