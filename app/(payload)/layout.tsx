import config from "@payload-config";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import React from "react";
import { importMap } from "./importMap.js";

import "@payloadcms/next/css";

type Args = {
  children: React.ReactNode;
};

const serverFunction: typeof handleServerFunctions = async function (args) {
  "use server";
  return handleServerFunctions(args);
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;
