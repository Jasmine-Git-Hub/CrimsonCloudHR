import {
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  Timer,
  TrendingUp,
  Users,
  PieChart,
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Top Section - Time at Work, My Actions, Quick Launch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time at Work */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#630000]" />
            <h2 className="text-lg text-[#1B1717]">Time at Work</h2>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#810100] flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[#810100]">Punched Out</p>
              <p className="text-xs text-[#1B1717]/60">
                Punched Out: Feb 27th at 01:27 PM (GMT 8)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-4 border-t border-gray-200">
            <span className="text-2xl text-[#1B1717]">0h 0m</span>
            <span className="text-sm text-[#1B1717]/60">Today</span>
            <button className="w-12 h-12 rounded-full bg-[#810100] flex items-center justify-center hover:bg-[#630000] transition-colors">
              <Clock className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#1B1717]/60">This Week</span>
              <span className="text-[#1B1717]">0h 0m</span>
            </div>
            <div className="text-xs text-[#1B1717]/60">Mar 02 - Mar 08</div>
            <div className="mt-3 h-24 flex items-end gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-[#EDEBDD] rounded-t"
                    style={{ height: `${Math.random() * 60 + 20}px` }}
                  ></div>
                  <span className="text-xs text-[#1B1717]/60">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#630000]" />
            <h2 className="text-lg text-[#1B1717]">My Actions</h2>
          </div>

          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-32 h-32 mb-4 opacity-20">
              <svg viewBox="0 0 100 100" className="text-[#630000]">
                <rect
                  x="20"
                  y="30"
                  width="60"
                  height="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M 30,40 L 40,50 L 60,30" stroke="currentColor" strokeWidth="2" fill="none" />
                <line x1="30" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="2" />
                <line x1="30" y1="70" x2="55" y2="70" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <p className="text-[#1B1717]/60 text-sm">No Pending Actions to Perform</p>
          </div>
        </div>

        {/* Quick Launch */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#630000]" />
            <h2 className="text-lg text-[#1B1717]">Quick Launch</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: CheckCircle, label: "Assign Leave" },
              { icon: FileText, label: "Leave List" },
              { icon: Timer, label: "Timesheets" },
              { icon: Calendar, label: "Apply Leave" },
              { icon: Clock, label: "My Leave" },
              { icon: Timer, label: "My Timesheet" },
            ].map((item, i) => (
              <button
                key={i}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[#EDEBDD] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#630000]/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-[#630000]" />
                </div>
                <span className="text-xs text-center text-[#1B1717]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buzz Latest Posts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[#630000]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            <h2 className="text-lg text-[#1B1717]">Buzz Latest Posts</h2>
          </div>

          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-32 h-32 mb-4 opacity-20">
              <svg viewBox="0 0 100 100" className="text-[#630000]">
                <rect
                  x="15"
                  y="25"
                  width="70"
                  height="50"
                  rx="5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="2" />
                <line x1="25" y1="50" x2="60" y2="50" stroke="currentColor" strokeWidth="2" />
                <line x1="25" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <p className="text-[#1B1717]/60 text-sm">No Posts Available</p>
          </div>
        </div>

        {/* Employees on Leave Today */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#630000]" />
              <h2 className="text-lg text-[#1B1717]">Employees on Leave Today</h2>
            </div>
            <button className="text-[#630000] hover:text-[#810100]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-32 h-32 mb-4 opacity-20">
              <svg viewBox="0 0 100 100" className="text-[#630000]">
                <rect
                  x="15"
                  y="25"
                  width="70"
                  height="50"
                  rx="5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="35" cy="45" r="8" fill="currentColor" />
                <circle cx="65" cy="45" r="8" fill="currentColor" />
                <path
                  d="M 35,55 Q 50,65 65,55"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="text-[#1B1717]/60 text-sm">No Employees on Leave</p>
          </div>
        </div>

        {/* Employee Distribution by Sub Unit */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-[#630000]" />
            <h2 className="text-lg text-[#1B1717]">Employee Distribution by Sub Unit</h2>
          </div>

          <div className="flex items-center justify-center py-8">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#EDEBDD"
                  strokeWidth="40"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#810100"
                  strokeWidth="40"
                  strokeDasharray="502.4"
                  strokeDashoffset="0"
                  transform="rotate(-90 100 100)"
                />
                <text
                  x="100"
                  y="105"
                  textAnchor="middle"
                  className="text-3xl"
                  fill="#1B1717"
                >
                  100.0%
                </text>
              </svg>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#810100]"></div>
                <span className="text-[#1B1717]">All Departments</span>
              </div>
              <span className="text-[#630000]">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg text-[#1B1717] mb-6">Employee Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-[#810100] to-[#630000] rounded-lg text-white">
            <div className="text-4xl mb-2">145</div>
            <div className="text-sm opacity-90">Total Employees</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-[#630000] to-[#810100] rounded-lg text-white">
            <div className="text-4xl mb-2">12</div>
            <div className="text-sm opacity-90">New Hires This Month</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-[#810100] to-[#630000] rounded-lg text-white">
            <div className="text-4xl mb-2">8</div>
            <div className="text-sm opacity-90">On Leave Today</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-[#630000] to-[#810100] rounded-lg text-white">
            <div className="text-4xl mb-2">3</div>
            <div className="text-sm opacity-90">Pending Approvals</div>
          </div>
        </div>
      </div>
    </div>
  );
}
