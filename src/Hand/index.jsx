import { useEffect, useRef, useState } from 'react';
import { numberColor } from '../utils/roomData';
import './Hand.css';

const DRAG_THRESHOLD = 8; // ขยับไม่ถึงนี้ถือว่าแตะ (เปิดการ์ด/กดปุ่ม) ไม่ใช่ลาก
const SWIPE_DISTANCE = 40; // ลากเกินนี้แล้วปล่อย = พับ/กาง

const isEditable = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

const ChevronDown = () => (
  <svg className="hand-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// การ์ดบนมือ: ติดขอบล่างจอ เรียงเป็นพัด พับลงให้โผล่นิดเดียวได้
// ready = โหลดเลขจาก DB ครั้งแรกแล้ว (ใช้แยก "เพิ่งเปิดหน้า" ออกจาก "host เพิ่งแจก")
const Hand = ({ numbers, revealed, skipped, onOpen, ready }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dealKey, setDealKey] = useState(0); // เปลี่ยนเมื่อมีการแจกใหม่ เพื่อเล่น animation แจกไพ่
  const [dragOffset, setDragOffset] = useState(null);
  const lastHandRef = useRef(undefined);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const expandedRef = useRef(true);
  const autoCollapsedRef = useRef(false);

  useEffect(() => { expandedRef.current = isExpanded; }, [isExpanded]);

  // host แจกไพ่ใหม่ (การ์ดบนมือเปลี่ยน): บังคับกาง แล้วเล่น animation การ์ดลอยขึ้นมาจากล่างจอ
  const handSignature = numbers.join(',');
  useEffect(() => {
    if (!ready) return;
    const isFirst = lastHandRef.current === undefined;
    const changed = handSignature !== lastHandRef.current;
    lastHandRef.current = handSignature;
    if (isFirst || !changed || !handSignature) return;
    autoCollapsedRef.current = false;
    setIsExpanded(true);
    setDealKey((key) => key + 1);
  }, [ready, handSignature]);

  // พิมพ์แชทอยู่ การ์ดบนมือจะบังช่องพิมพ์ (และคีย์บอร์ดมือถือดันการ์ดขึ้นมา): พับไว้ก่อน พิมพ์เสร็จกางกลับ
  useEffect(() => {
    const handleFocusIn = (event) => {
      if (!isEditable(event.target) || !expandedRef.current) return;
      autoCollapsedRef.current = true;
      expandedRef.current = false;
      setIsExpanded(false);
    };
    const handleFocusOut = (event) => {
      if (!isEditable(event.target) || !autoCollapsedRef.current) return;
      autoCollapsedRef.current = false;
      expandedRef.current = true;
      setIsExpanded(true);
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const toggle = () => {
    if (suppressClickRef.current) return;
    autoCollapsedRef.current = false;
    setIsExpanded((prev) => !prev);
  };

  // มือถือ: ลากขึ้น/ลงเพื่อกาง/พับ (เมาส์ใช้ปุ่มแทน จะได้ไม่ชนกับการคลิกการ์ด)
  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse') return;
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, moved: false };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    // กางอยู่ลากลงได้อย่างเดียว พับอยู่ลากขึ้นได้อย่างเดียว
    setDragOffset(isExpanded ? Math.max(0, dy) : Math.min(0, dy));
  };

  const handlePointerEnd = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragOffset(null);
    if (!drag.moved) return;
    const dy = event.clientY - drag.startY;
    if (isExpanded && dy > SWIPE_DISTANCE) setIsExpanded(false);
    if (!isExpanded && dy < -SWIPE_DISTANCE) setIsExpanded(true);
    autoCollapsedRef.current = false;
    // ไม่ให้การปล่อยนิ้วบนการ์ดกลายเป็นการเปิดการ์ด
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 0);
  };

  // พับอยู่ = ยังมองไม่เห็นเลข แตะการ์ดแค่กางขึ้นมาก่อน ยืนยันลงไพ่ได้ตอนกางแล้วเท่านั้น
  const openCard = (number) => {
    if (suppressClickRef.current) return;
    if (!isExpanded) {
      autoCollapsedRef.current = false;
      setIsExpanded(true);
      return;
    }
    onOpen(number);
  };

  if (numbers.length === 0) return null;

  const classNames = ['hand-inner', isExpanded ? '' : 'is-collapsed', dragOffset !== null ? 'is-dragging' : ''].filter(Boolean).join(' ');

  return (
    <>
      {/* กันเนื้อหาท้ายหน้า (รายชื่อผู้เล่น) ไม่ให้โดนการ์ดบัง */}
      <div className={`hand-spacer ${isExpanded ? '' : 'is-collapsed'}`} aria-hidden="true" />
      <section className="hand" aria-label="การ์ดบนมือ" style={{ '--n': numbers.length }}>
        <div
          className={classNames}
          style={dragOffset !== null ? { '--drag': `${dragOffset}px` } : undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="hand-toolbar">
            <button
              className="hand-toggle"
              onClick={toggle}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'เก็บการ์ดบนมือ' : 'แสดงการ์ดบนมือ'}
            >
              <ChevronDown />
            </button>
          </div>
          <div className="hand-cards" key={dealKey}>
            {numbers.map((value, index) => {
              const isRevealed = revealed.has(value);
              const isSkipped = skipped.has(value);
              return (
                <h1
                  key={value}
                  className={['play-card', dealKey > 0 ? 'is-dealing' : '', isRevealed ? 'is-revealed' : '', isSkipped ? 'is-skipped' : ''].filter(Boolean).join(' ')}
                  style={{ '--i': index, ...(isRevealed ? {} : { color: numberColor(value) }) }}
                  title={isSkipped ? 'เลขนี้โดนข้ามไปแล้ว' : undefined}
                  tabIndex={0}
                  onClick={() => openCard(value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(value); } }}
                >
                  {value}
                </h1>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default Hand;
