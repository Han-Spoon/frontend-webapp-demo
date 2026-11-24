import logo from '../../../assets/brand/han-spoon-logo.svg';

/** 한스푼 글자 로고. 한 화면에 한 번만, 색을 바꾸거나 늘이지 않는다. */
export function Logo({ height = 32, className = '' }: { height?: number; className?: string }) {
  return <img src={logo} alt="Han Spoon" height={height} style={{ height, width: 'auto' }} className={className} />;
}
