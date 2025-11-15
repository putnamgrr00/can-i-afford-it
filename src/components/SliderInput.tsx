"use client";

import { useCallback, useEffect, useState, type ChangeEventHandler, type MouseEventHandler } from "react";
import { formatCurrency } from "@/lib/money";
import styles from "./SliderInput.module.css";

type SliderInputProps = {
  id: string;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  ariaLabel: string;
};

export function SliderInput({
  id,
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: SliderInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  const [shouldPop, setShouldPop] = useState(false);

  useEffect(() => {
    if (value !== previousValue) {
      setShouldPop(true);
      setPreviousValue(value);
      const timer = setTimeout(() => setShouldPop(false), 200);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue]);

  const handleSliderChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const newValue = Number(event.target.value);
      onChange(newValue);
    },
    [onChange],
  );

  const handleInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const newValue = Number(event.target.value);
      const clampedValue = Math.max(min, Math.min(max, newValue));
      onChange(clampedValue);
    },
    [onChange, min, max],
  );

  const handleMouseDown = useCallback<MouseEventHandler<HTMLInputElement>>(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback<MouseEventHandler<HTMLInputElement>>(() => {
    setIsDragging(false);
  }, []);

  const percentage = ((value - min) / (max - min)) * 100;
  const scaleY = 0.9 + (percentage / 100) * 0.3; // Scale from 0.9 to 1.2 based on value
  const emojiScale = 1 + (percentage / 100) * 0.4; // Scale from 1.0 → 1.4

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {description ? <span className={styles.description}>{description}</span> : null}
      <div className={styles.sliderWrapper}>
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className={`${styles.slider} ${isDragging ? styles.sliderDragging : ""}`}
          style={{ "--thumb-scale-y": scaleY } as React.CSSProperties}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
        <div
          className={styles.sliderTrack}
          style={{ "--fill-percentage": `${percentage}%` } as React.CSSProperties}
        >
          <div className={styles.sliderFill} />
        </div>
      </div>
      <div className={styles.outputRow}>
        <span 
          className={styles.moneyEmoji}
          style={{ "--emoji-scale": emojiScale } as React.CSSProperties}
          aria-hidden="true"
        >
          💵
        </span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleInputChange}
          className={styles.numberInput}
          aria-label={`${ariaLabel} numeric input`}
        />
        <span className={`${styles.currencyValue} ${shouldPop ? styles.valuePopping : ""}`}>
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  );
}

