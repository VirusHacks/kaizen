import clsx from 'clsx'
import React from 'react'

type Props = { selected: boolean }

const Projects = ({ selected }: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 6C3 4.34315 4.34315 3 6 3H8.58579C9.11622 3 9.62493 3.21071 10 3.58579L11.4142 5H18C19.6569 5 21 6.34315 21 8V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6Z"
        className={clsx(
          'dark:group-hover:fill-[#C8C7FF] transition-all dark:fill-[#353346] fill-[#BABABB] group-hover:fill-[#7540A9]',
          { 'dark:!fill-[#C8C7FF] !fill-[#7540A9] ': selected }
        )}
      />
      <path
        d="M7 12H17M7 16H13"
        stroke={selected ? '#1C1F2E' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-all"
      />
    </svg>
  )
}

export default Projects
