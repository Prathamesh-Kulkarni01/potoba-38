"use client";
import React from "react";
import { ContainerScroll } from "./container-scroll-animation";

export default function HeroScrollDemo({text1, text2,children}: {text1: string, text2  : string,children: React.ReactNode}) {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-black dark:text-white">
              {text1}<br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                {text2}
              </span>
            </h1>
          </>
        }
      >
        {children}
      </ContainerScroll>
    </div>
  );
}