const locations: [number, string][] = [
  [-12, "Baker Island"],
  [-11, "American Samoa"],
  [-10, "Hawaii"],
  [-9.5, "Marquesas Islands"],
  [-9, "Alaska (standard time)"],
  [-8, "Pacific (standard time)"],
  [-7, "Mountain (standard time)"],
  [-6, "Central (standard time)"],
  [-5, "Eastern (standard time)"],
  [-4, "Atlantic (standard time)"],
  [-3.5, "Newfoundland (standard time)"],
  [-3, "Argentina"],
  [-2.5, "Newfoundland (daylight time)"],
  [-2, "South Georgia"],
  [-1, "Azores (standard time)"],
  [0, "UTC / London (standard time)"],
  [1, "Central Europe (standard time)"],
  [2, "South Africa"],
  [3, "Saudi Arabia"],
  [3.5, "Iran"],
  [4, "United Arab Emirates"],
  [4.5, "Afghanistan"],
  [5, "Pakistan"],
  [5.5, "India / Sri Lanka"],
  [5.75, "Nepal"],
  [6, "Bangladesh"],
  [6.5, "Myanmar"],
  [7, "Thailand / Vietnam"],
  [8, "Singapore / China"],
  [8.75, "Eucla"],
  [9, "Japan / South Korea"],
  [9.5, "Darwin / Adelaide (standard time)"],
  [10, "Brisbane / Sydney (standard time)"],
  [10.5, "Lord Howe (standard time) / Adelaide (daylight time)"],
  [11, "Solomon Islands / Sydney (daylight time)"],
  [12, "Fiji / New Zealand (standard time)"],
  [12.75, "Chatham Islands (standard time)"],
  [13, "Tonga / New Zealand (daylight time)"],
  [13.75, "Chatham Islands (daylight time)"],
  [14, "Kiritimati"],
];

export const TIMEZONE_OFFSETS = locations.map(([hours, location]) => {
  const minutes = Math.round(Math.abs(hours) * 60);
  const offset = `${hours < 0 ? "-" : "+"}${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return { hours, label: `UTC${offset} - ${location}` };
});

export function parseTimezoneOffset(value: string): number {
  const hours = Number(value);
  if (value.trim() === "" || !TIMEZONE_OFFSETS.some((option) => option.hours === hours)) {
    throw new Error("Select a valid timezone.");
  }
  return hours;
}
