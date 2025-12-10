import { Text } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import ServerSelector from './ServerSelector';

export default function TopBar() {

  return (
    <header
      className={style({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        borderBottom: 'thin',
        borderBottomColor: 'gray-300',
        display: 'flex',
        alignItems: 'center',
        paddingX: 16,
        isolation: 'isolate',
        justifyContent: 'space-between',
        zIndex: 1000,
        backgroundColor: 'layer-1',
      })}
    >
      <div className={style({ display: 'flex', alignItems: 'center' })}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={style({ marginX: 8 })}>
          <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" fill="#EB1000"/>
          <path d="M12 6L8 18H10.5L11.2 16H14.8L15.5 18H18L14 6H12ZM11.8 14L13 10L14.2 14H11.8Z" fill="white"/>
        </svg>
        <Text styles={style({ font: 'body-sm' })}>LLM Conversion Bridge</Text>
      </div>

      <div className={style({ display: 'flex', alignItems: 'center', gap: 16 })}>
        <ServerSelector />
      </div>
    </header>
  );
}
