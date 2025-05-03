import { DatePicker } from "./DatePicker";
import RadioInterval from "./RadioInterval";
import { Settings, Calendar, BarChart } from "lucide-react";

function Options() {
  return (
    <div className="bg-slate-900 shadow-lg border border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-white">Display Options</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <BarChart className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Interval:</span>
          <RadioInterval />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Date Range:</span>
          <DatePicker />
        </div>
      </div>
    </div>
  );
}

export default Options;
