import React, { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Plus,
  Sparkles,
  Loader2,
  X,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Info,
  LogIn,
  LogOut,
} from "lucide-react";

const API_URL = "http://localhost:3001/api";
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600;700&display=swap');
  :root { --brand-primary: #0f172a; --brand-accent: #2563eb; --brand-bg: #f8fafc; }
  body { font-family: 'Anuphan', sans-serif; background-color: var(--brand-bg); color: #1e293b; }
  .glass-panel { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(226, 232, 240, 0.8); }
  .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.05); border-color: var(--brand-accent); }
`;

const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    primary: "bg-blue-50 text-blue-700 border-blue-100",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${variants[variant]}`}
    >
      {children}
    </span>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authFormData, setAuthFormData] = useState({
    student_id: "",
    email: "",
    password: "",
    name: "",
  });

  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [qrCode, setQrCode] = useState(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/activities`);
      const data = await response.json();
      const mappedData = data.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        date: new Date(item.activity_date).toLocaleDateString("th-TH"),
        location: item.location,
        participants: item.current_seats || 0,
        maxParticipants: item.max_seats,
        category: "General",
        image:
          "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800",
      }));
      setActivities(mappedData);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? "/register" : "/login";
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authFormData),
      });
      const data = await res.json();
      if (res.ok) {
        if (isRegistering) {
          alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
          setIsRegistering(false);
        } else {
          setUser(data.user); // data.user จะมี {id, student_id, name, role}
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  const analyzeWithAI = async (activity) => {
    setSelectedActivity(activity);
    setAiLoading(true);
    setAiResult("");
    setQrCode(null);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `วิเคราะห์ประโยชน์ที่จะได้รับจากกิจกรรม: ${activity.title} รายละเอียด: ${activity.description} ตอบสั้นๆ 3 ข้อ`,
                  },
                ],
              },
            ],
          }),
        },
      );
      const data = await response.json();
      setAiResult(
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "ไม่สามารถวิเคราะห์ได้",
      );
    } catch (err) {
      setAiResult("เกิดข้อผิดพลาดในการเรียก AI");
    } finally {
      setAiLoading(false);
    }
  };

  const registerActivity = async (activityId) => {
    try {
      const res = await fetch(`${API_URL}/activities/${activityId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchActivities();
        setQrCode(data.qr);
        alert("ลงทะเบียนสำเร็จ!");
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("เชื่อมต่อเซิร์ฟเวอร์ผิดพลาด");
    }
  };

  const filtered = activities.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6">
            {isRegistering ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  required
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) =>
                    setAuthFormData({ ...authFormData, name: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="รหัสนักศึกษา"
                  required
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) =>
                    setAuthFormData({
                      ...authFormData,
                      student_id: e.target.value,
                    })
                  }
                />
              </>
            )}

            <input
              type="email"
              placeholder="อีเมลนักศึกษา"
              required
              className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) =>
                setAuthFormData({ ...authFormData, email: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="รหัสผ่าน"
              required
              className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) =>
                setAuthFormData({ ...authFormData, password: e.target.value })
              }
            />

            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all">
              {isRegistering ? "ยืนยันการสมัคร" : "เข้าสู่ระบบด้วยอีเมล"}
            </button>
          </form>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full mt-4 text-sm text-blue-600 font-bold hover:underline"
          >
            {isRegistering
              ? "มีบัญชีแล้ว? ล็อกอิน"
              : "ยังไม่มีบัญชี? สมัครที่นี่"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{styles}</style>
      <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Calendar size={22} />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              ACTIVITY<span className="text-blue-600">HUB</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-full pr-4 border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-bold text-slate-600">
                {user.name}
              </span>
              <button
                onClick={() => setUser(null)}
                className="ml-2 p-1 text-slate-400 hover:text-red-500"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <Badge variant="primary">Welcome Back</Badge>
            <h2 className="text-4xl font-black text-slate-900 mt-4">
              ค้นหากิจกรรมที่น่าสนใจ
            </h2>
          </div>
          <div className="relative w-full md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="ค้นหา..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((activity) => (
              <div
                key={activity.id}
                className="card-hover bg-white rounded-[2.5rem] p-2 border border-slate-100 group flex flex-col"
              >
                <div className="h-48 rounded-[2rem] overflow-hidden">
                  <img
                    src={activity.image}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                    {activity.title}
                  </h3>
                  <div className="flex gap-4 mb-6 text-slate-500 text-xs font-bold">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} /> {activity.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={14} /> {activity.participants}/
                      {activity.maxParticipants}
                    </div>
                  </div>
                  <button
                    onClick={() => analyzeWithAI(activity)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                  >
                    <BrainCircuit size={18} /> รายละเอียด / ลงทะเบียน
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedActivity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-slate-900">
                  {selectedActivity.title}
                </h3>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-blue-50 rounded-[2rem] p-8 border border-blue-100 min-h-[200px] flex flex-col items-center justify-center">
                {aiLoading ? (
                  <div className="flex flex-col items-center">
                    <Loader2
                      className="animate-spin text-blue-600 mb-4"
                      size={32}
                    />
                    <p className="font-bold text-blue-600">
                      AI กำลังประมวลผล...
                    </p>
                  </div>
                ) : qrCode ? (
                  <div className="text-center">
                    <Badge variant="success">ลงทะเบียนสำเร็จ!</Badge>
                    <img
                      src={qrCode}
                      className="w-40 h-40 mx-auto mt-4 border-4 border-white rounded-xl shadow-md"
                    />
                    <p className="text-xs text-slate-400 mt-2 italic">
                      * บันทึกรูปภาพเพื่อใช้เช็คชื่อ
                    </p>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-3 text-blue-700 font-bold">
                      <Sparkles size={18} /> ประโยชน์ของกิจกรรม
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {aiResult}
                    </p>
                  </div>
                )}
              </div>

              {!qrCode && (
                <button
                  onClick={() => registerActivity(selectedActivity.id)}
                  className="w-full mt-8 py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  ยืนยันการลงทะเบียน
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
