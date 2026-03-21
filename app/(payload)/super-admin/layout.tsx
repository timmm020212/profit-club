import type { ServerFunctionClient } from 'payload'
import config from '@payload-config'
import { RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import { importMap } from './importMap.js'
import '@payloadcms/next/css'

import { handleServerFunctions } from '@payloadcms/next/utilities'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) =>
  RootLayout({ children, config, importMap, serverFunction })

export default Layout
