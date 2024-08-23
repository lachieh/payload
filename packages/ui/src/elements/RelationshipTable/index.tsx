'use client'
import type {
  ClientCollectionConfig,
  ClientField,
  JoinFieldClient,
  JoinFieldProps,
  PaginatedDocs,
  Where,
} from 'payload'

import { getTranslation } from '@payloadcms/translations'
import React, { useCallback, useEffect, useReducer, useState } from 'react'
import AnimateHeightImport from 'react-animate-height'

const AnimateHeight = AnimateHeightImport.default || AnimateHeightImport

import type { DocumentDrawerProps } from '../DocumentDrawer/types.js'

import { Pill } from '../../elements/Pill/index.js'
import { usePayloadAPI } from '../../hooks/usePayloadAPI.js'
import { ChevronIcon } from '../../icons/Chevron/index.js'
import { useConfig } from '../../providers/Config/index.js'
import { ListQueryProvider } from '../../providers/ListQuery/index.js'
import { useTranslation } from '../../providers/Translation/index.js'
import { ColumnSelector } from '../ColumnSelector/index.js'
import { useDocumentDrawer } from '../DocumentDrawer/index.js'
import { UseDocumentDrawer } from '../DocumentDrawer/types.js'
import { hoistQueryParamsToAnd } from '../ListDrawer/DrawerContent.js'
import { LoadingOverlay } from '../Loading/index.js'
import { RelationshipProvider } from '../Table/RelationshipProvider/index.js'
import { TableColumnsProvider } from '../TableColumns/index.js'
import { MyTableComponent } from './MyTable.js'
import { DrawerLink } from './cells/DrawerLink/index.js'
import './index.scss'

const baseClass = 'relationship-table'

type RelationshipTableComponentProps = {
  readonly Label?: React.ReactNode
  readonly field: JoinFieldProps['field']
  readonly filterOptions?: Where | boolean
  readonly initialData?: PaginatedDocs
  readonly relationTo: string
}

export const RelationshipTable: React.FC<RelationshipTableComponentProps> = (props) => {
  const { Label, field, filterOptions, initialData: initialDataFromProps, relationTo } = props

  const {
    config: {
      routes: { api },
      serverURL,
    },
    getEntityConfig,
  } = useConfig()

  const [initialData, setInitialData] = useState<PaginatedDocs>(initialDataFromProps)

  const { i18n, t } = useTranslation()

  const [limit, setLimit] = useState<number>()
  const [sort, setSort] = useState<string | undefined>(undefined)
  const [page, setPage] = useState<number>(1)
  const [where, setWhere] = useState<Where | null>(null)
  const [search, setSearch] = useState<string>('')
  const [openColumnSelector, setOpenColumnSelector] = useState(false)

  const collectionConfig = getEntityConfig({ collectionSlug: relationTo }) as ClientCollectionConfig

  const apiURL = `${serverURL}${api}/${collectionConfig.slug}`

  const [cacheBust, dispatchCacheBust] = useReducer((state) => state + 1, 0) // used to force a re-fetch even when apiURL is unchanged

  const [{ data, isError, isLoading: isLoadingList }, { setParams }] = usePayloadAPI(apiURL, {
    initialData,
    initialParams: {
      depth: 0,
    },
  })

  useEffect(() => {
    const {
      admin: { listSearchableFields, useAsTitle } = {} as ClientCollectionConfig['admin'],
      versions,
    } = collectionConfig

    const params: {
      cacheBust?: number
      depth?: number
      draft?: string
      limit?: number
      page?: number
      search?: string
      sort?: string
      where?: unknown
    } = {
      depth: 0,
    }

    let copyOfWhere = { ...(where || {}) }

    if (filterOptions && typeof filterOptions !== 'boolean') {
      copyOfWhere = hoistQueryParamsToAnd(copyOfWhere, filterOptions)
    }

    if (search) {
      const searchAsConditions = (listSearchableFields || [useAsTitle]).map((fieldName) => {
        return {
          [fieldName]: {
            like: search,
          },
        }
      }, [])

      if (searchAsConditions.length > 0) {
        const searchFilter: Where = {
          or: [...searchAsConditions],
        }

        copyOfWhere = hoistQueryParamsToAnd(copyOfWhere, searchFilter)
      }
    }

    if (limit) params.limit = limit
    if (page) params.page = page
    if (sort) params.sort = sort
    if (cacheBust) params.cacheBust = cacheBust
    if (copyOfWhere) params.where = copyOfWhere
    if (versions?.drafts) params.draft = 'true'

    setParams(params)
  }, [page, sort, where, search, cacheBust, collectionConfig, setParams, limit, filterOptions])

  const [DocumentDrawer, DocumentDrawerToggler] = useDocumentDrawer({
    collectionSlug: relationTo,
  })

  const onDrawerSave = useCallback<DocumentDrawerProps['onSave']>(
    (args) => {
      const foundDocIndex = data?.docs?.findIndex((doc) => doc.id === args.doc.id)
      if (foundDocIndex !== -1) {
        const newDocs = [...data.docs]
        newDocs[foundDocIndex] = args.doc
        setInitialData({
          ...data,
          docs: newDocs,
        })
      }
    },
    [data],
  )

  const preferenceKey = `${relationTo}-list`

  if (isLoadingList) {
    return <LoadingOverlay />
  }

  return (
    <div className={baseClass}>
      <div className={`${baseClass}__header`}>
        {Label}
        <div className={`${baseClass}__actions`}>
          <DocumentDrawerToggler>{i18n.t('fields:addNew')}</DocumentDrawerToggler>
          <Pill
            aria-controls={`${baseClass}-columns`}
            aria-expanded={openColumnSelector}
            className={`${baseClass}__toggle-columns ${
              openColumnSelector ? `${baseClass}__buttons-active` : ''
            }`}
            icon={<ChevronIcon direction={openColumnSelector ? 'up' : 'down'} />}
            onClick={() => setOpenColumnSelector(!openColumnSelector)}
            pillStyle="light"
          >
            {t('general:columns')}
          </Pill>
        </div>
      </div>
      <RelationshipProvider>
        <ListQueryProvider
          data={data}
          defaultLimit={limit || collectionConfig?.admin?.pagination?.defaultLimit}
          defaultSort={sort}
          handlePageChange={setPage}
          handlePerPageChange={setLimit}
          handleSearchChange={setSearch}
          handleSortChange={setSort}
          handleWhereChange={setWhere}
          modifySearchParams={false}
          preferenceKey={preferenceKey}
        >
          <TableColumnsProvider
            beforeRows={[
              {
                Heading: i18n.t('version:type'),
                accessor: 'collection',
                active: true,
                cellProps: {
                  field: {
                    admin: {
                      components: {
                        Cell: {
                          type: 'client',
                          RenderedComponent: (
                            <Pill>{getTranslation(collectionConfig.labels.singular, i18n)}</Pill>
                          ),
                        },
                      },
                      disableListColumn: true,
                    },
                  } as ClientField,
                },
              },
            ]}
            cellProps={[
              {
                field: {
                  admin: {
                    components: {
                      Cell: {
                        type: 'client',
                        RenderedComponent: (
                          <DrawerLink
                            field={field as JoinFieldClient}
                            onDrawerSave={onDrawerSave}
                          />
                        ),
                      },
                    },
                  },
                } as ClientField,
                link: false,
              },
            ]}
            collectionSlug={relationTo}
            preferenceKey={preferenceKey}
          >
            {/* @ts-expect-error TODO: get this CJS import to work, eslint keeps removing the type assertion */}
            <AnimateHeight
              className={`${baseClass}__columns`}
              height={openColumnSelector ? 'auto' : 0}
              id={`${baseClass}-columns`}
            >
              <div className={`${baseClass}__columns-inner`}>
                <ColumnSelector collectionSlug={collectionConfig.slug} />
              </div>
            </AnimateHeight>
            <MyTableComponent collectionConfig={collectionConfig} />
          </TableColumnsProvider>
        </ListQueryProvider>
      </RelationshipProvider>
      <DocumentDrawer />
    </div>
  )
}
