import React from "react";

export default function AvatarProgressCircle({ avatarUrl, xpCurrent, xpRequired, level }) {
  const radius = 30;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = Math.min(xpCurrent / xpRequired, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center text-center">
      <svg height={radius * 2} width={radius * 2} className="mb-2">
        <circle
          stroke="#e5e7eb" // Tailwind gray-200
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#6366f1" // Tailwind indigo-500
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <image
          href={avatarUrl}
          x={radius - 20}
          y={radius - 20}
          height="40"
          width="40"
          clipPath={`circle(20px at 20px 20px)`}
        />
      </svg>

      <div className="text-xs text-gray-700 font-medium">
        {xpCurrent} / {xpRequired} XP
      </div>
      <div className="text-xs text-indigo-600 font-semibold">Level {level}</div>
    </div>
  );
}
