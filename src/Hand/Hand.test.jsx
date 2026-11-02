import { render, screen, act, fireEvent } from '@testing-library/react';
import Hand from '.';

const noop = () => {};
const renderHand = (props = {}) => {
  const all = { numbers: [12, 40], revealed: new Set(), skipped: new Set(), onOpen: noop, ready: true, ...props };
  const utils = render(<Hand {...all} />);
  return { ...utils, rerenderHand: (next) => utils.rerender(<Hand {...all} {...next} />) };
};
const toggle = () => screen.getByRole('button', { name: /การ์ดบนมือ/ });
const cards = () => screen.getAllByRole('heading', { level: 1 });
const hand = () => document.querySelector('.hand-inner');

test('ไม่มีการ์ดไม่แสดงอะไร', () => {
  renderHand({ numbers: [] });
  expect(screen.queryByRole('region', { name: 'การ์ดบนมือ' })).not.toBeInTheDocument();
});

test('แสดงการ์ดเรียงพัด แตะการ์ดแล้วเปิด', () => {
  const onOpen = jest.fn();
  renderHand({ onOpen });
  expect(cards().map((c) => c.textContent)).toEqual(['12', '40']);
  expect(cards()[1].style.getPropertyValue('--i')).toBe('1');
  fireEvent.click(cards()[0]);
  expect(onOpen).toHaveBeenCalledWith(12);
});

test('ปุ่มเก็บ/แสดงการ์ด', () => {
  renderHand();
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(toggle());
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  expect(hand()).toHaveClass('is-collapsed');
  fireEvent.click(toggle());
  expect(hand()).not.toHaveClass('is-collapsed');
});

test('เปิดหน้ามาเจอการ์ดเดิมไม่เล่น animation แจก แต่ host แจกใหม่: เล่น animation และบังคับกาง', () => {
  const { rerenderHand } = renderHand();
  expect(cards()[0]).not.toHaveClass('is-dealing');

  fireEvent.click(toggle()); // ผู้เล่นพับไว้
  rerenderHand({ numbers: [5, 77] });
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  expect(cards()[0]).toHaveClass('is-dealing');
});

test('ยังไม่ได้การ์ด แล้วได้รับแจก ก็เล่น animation', () => {
  const { rerenderHand } = renderHand({ numbers: [] });
  rerenderHand({ numbers: [8] });
  expect(cards()[0]).toHaveClass('is-dealing');
});

test('ข้อมูลยังโหลดไม่เสร็จ (ready=false) ไม่นับเป็นการแจก', () => {
  const { rerenderHand } = renderHand({ numbers: [], ready: false });
  rerenderHand({ numbers: [3, 9], ready: true });
  expect(cards()[0]).not.toHaveClass('is-dealing');
});

test('มือถือ: ลากลงเพื่อพับ ลากขึ้นเพื่อกาง และการลากไม่เปิดการ์ด', () => {
  const onOpen = jest.fn();
  renderHand({ onOpen });
  const drag = (from, to) => {
    fireEvent.pointerDown(hand(), { pointerId: 1, pointerType: 'touch', clientY: from });
    fireEvent.pointerMove(hand(), { pointerId: 1, pointerType: 'touch', clientY: to });
    fireEvent.pointerUp(hand(), { pointerId: 1, pointerType: 'touch', clientY: to });
  };
  drag(500, 580);
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(cards()[0]); // click ที่ตามหลัง pointerup
  expect(onOpen).not.toHaveBeenCalled();

  drag(600, 520);
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');

  drag(500, 520); // ลากสั้นเกินไป ไม่เปลี่ยน
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');
});

test('โฟกัสช่องพิมพ์แล้วเก็บการ์ด เลิกโฟกัสแล้วกางกลับ', () => {
  render(<><input aria-label="chat" /><Hand numbers={[1]} revealed={new Set()} skipped={new Set()} onOpen={noop} ready /></>);
  act(() => screen.getByLabelText('chat').focus());
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  act(() => screen.getByLabelText('chat').blur());
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');
});

test('การ์ดที่เปิดแล้วเป็นสีเทา การ์ดที่โดนข้ามมีไฮไลต์', () => {
  renderHand({ revealed: new Set([12]), skipped: new Set([40]) });
  expect(cards()[0]).toHaveClass('is-revealed');
  expect(cards()[1]).toHaveClass('is-skipped');
});

test('พับอยู่แล้วแตะการ์ด: กางขึ้นมาก่อนโดยยังไม่ลงไพ่ แตะอีกครั้งตอนกางแล้วจึงลงไพ่', () => {
  const onOpen = jest.fn();
  renderHand({ onOpen });
  fireEvent.click(toggle());
  fireEvent.click(cards()[0]);
  expect(onOpen).not.toHaveBeenCalled();
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(cards()[0]);
  expect(onOpen).toHaveBeenCalledWith(12);
});

test('พับอยู่แล้วกด Enter ที่การ์ด ก็แค่กางขึ้นมา', () => {
  const onOpen = jest.fn();
  renderHand({ onOpen });
  fireEvent.click(toggle());
  fireEvent.keyDown(cards()[1], { key: 'Enter' });
  expect(onOpen).not.toHaveBeenCalled();
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');
});
