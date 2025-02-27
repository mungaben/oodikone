import React from 'react'
import { Divider, Loader, Popup, Button, Message } from 'semantic-ui-react'
import xlsx from 'xlsx'
import {
  useGetFacultyCreditStatsQuery,
  useGetFacultyBasicStatsQuery,
  useGetFacultyThesisStatsQuery,
} from 'redux/facultyStats'
import LineGraph from 'components/StudyProgramme/BasicOverview/LineGraph'
import StackedBarChart from 'components/StudyProgramme/BasicOverview/StackedBarChart'
import useLanguage from 'components/LanguagePicker/useLanguage'
import InteractiveDataTable from '../InteractiveDataView'
import Toggle from '../../StudyProgramme/Toggle'
import InfoBox from '../../Info/InfoBox'
import InfotoolTips from '../../../common/InfoToolTips'
import sortProgrammeKeys from '../facultyHelpers'
import '../faculty.css'

const Overview = ({
  faculty,
  academicYear,
  setAcademicYear,
  studyProgrammes,
  setStudyProgrammes,
  specialGroups,
  setSpecialGroups,
}) => {
  const toolTips = InfotoolTips.Faculty
  const yearType = academicYear ? 'ACADEMIC_YEAR' : 'CALENDAR_YEAR'
  const studyProgrammeFilter = studyProgrammes ? 'ALL_PROGRAMMES' : 'NEW_STUDY_PROGRAMMES'
  const special = specialGroups ? 'SPECIAL_EXCLUDED' : 'SPECIAL_INCLUDED'
  const credits = useGetFacultyCreditStatsQuery({
    id: faculty?.code,
    yearType,
    studyProgrammeFilter,
    specialGroups: special,
  })
  const basics = useGetFacultyBasicStatsQuery({
    id: faculty?.code,
    yearType,
    studyProgrammeFilter,
    specialGroups: special,
  })
  const thesisWriters = useGetFacultyThesisStatsQuery({
    id: faculty?.code,
    yearType,
    studyProgrammeFilter,
    specialGroups: special,
  })
  const { getTextIn } = useLanguage()

  const downloadCsv = (titles, tableStats, programmeStats, programmeNames, toolTipText) => {
    const headers = titles.map(title => ({ label: title === '' ? 'Year' : title, key: title === '' ? 'Year' : title }))
    const csvData = sortProgrammeKeys(Object.keys(programmeStats)).reduce(
      (results, programme) => [
        ...results,
        ...programmeStats[programme].map(yearRow => {
          return {
            Programme: programme,
            Name: getTextIn(programmeNames[programme]),
            ...yearRow.reduce((result, value, valueIndex) => ({ ...result, [headers[valueIndex].key]: value }), {}),
          }
        }),
      ],
      []
    )

    const tableStatsAsCsv = tableStats.map(yearArray =>
      yearArray.reduce((result, value, yearIndex) => ({ ...result, [headers[yearIndex].key]: value }), {})
    )

    const book = xlsx.utils.book_new()
    const tableSheet = xlsx.utils.json_to_sheet(tableStatsAsCsv)
    xlsx.utils.book_append_sheet(book, tableSheet, 'TableStats')
    const sheet = xlsx.utils.json_to_sheet(csvData)
    xlsx.utils.book_append_sheet(book, sheet, 'ProgrammeStats')
    xlsx.writeFile(book, `${faculty.code}-${toolTipText}.xlsx`)
  }

  const getDivider = (title, toolTipText, titles, tableStats, programmeStats, programmeNames) => (
    <>
      <div className="divider">
        <Divider data-cy={`Section-${toolTipText}`} horizontal>
          {title}
        </Divider>
      </div>
      <InfoBox content={toolTips[toolTipText]} cypress={toolTipText} />
      <Popup
        content="Download statistics as xlsx file"
        trigger={
          <Button
            icon="download"
            floated="right"
            onClick={() => downloadCsv(titles, tableStats, programmeStats, programmeNames, toolTipText)}
            style={{ backgroundColor: 'white', borderRadius: 0 }}
          />
        }
      />
    </>
  )
  const isFetchingOrLoading =
    credits.isLoading ||
    credits.isFetching ||
    basics.isLoading ||
    basics.isFetching ||
    thesisWriters.isLoading ||
    thesisWriters.isFetching

  const isError =
    (basics.isError && credits.isError && thesisWriters.isError) ||
    (basics.isSuccess &&
      !basics.data &&
      credits.isSuccess &&
      !credits.data &&
      thesisWriters.isSuccess &&
      !thesisWriters.data)

  if (isError) return <h3>Something went wrong, please try refreshing the page.</h3>

  const creditShortTitles = ['Code', 'Total', 'Major', 'Non-major', 'Non-major other', 'Non-degree', 'Other Non-degree']
  let transferShortTitles = []
  if (special === 'SPECIAL_INCLUDED') {
    transferShortTitles = ['Code', 'Started', 'Graduated', 'Transferred in', 'Transferred away', 'Transferred to']
  } else {
    transferShortTitles = ['Code', 'Started', 'Graduated']
  }

  const options = {
    KH: 'Bachelors',
    MH: 'Masters',
    T: 'Doctors and Licentiates',
    LIS: 'Doctors and Licentiates',
    OTHER: 'Other',
  }

  const getChartPlotLinePlaces = programmeKeys => {
    if (programmeKeys.length === 0) return []
    let key = programmeKeys[0][1].slice(0, 2)
    if (!['KH', 'MH', 'T', 'LIS'].includes(key)) {
      key = 'OTHER'
    }
    const plotLinePlaces = [[0, options[key]]]
    for (let i = 0; i < programmeKeys.length - 1; i++) {
      if (
        (programmeKeys[i][1].startsWith('KH') && programmeKeys[i + 1][1].startsWith('MH')) ||
        (programmeKeys[i][1].startsWith('MH') && programmeKeys[i + 1][1].startsWith('KH')) ||
        (programmeKeys[i][1].startsWith('MH') && programmeKeys[i + 1][1].startsWith('T')) ||
        ((programmeKeys[i][1].startsWith('T') || programmeKeys[i][1].startsWith('LIS')) &&
          (programmeKeys[i + 1][1].startsWith('KH') || programmeKeys[i + 1][1].startsWith('MH'))) ||
        ((programmeKeys[i][1].startsWith('T') ||
          programmeKeys[i][1].startsWith('LIS') ||
          programmeKeys[i][1].startsWith('KH') ||
          programmeKeys[i][1].startsWith('MH')) &&
          programmeKeys[i + 1][1].startsWith('K-'))
      ) {
        let key = programmeKeys[i + 1][1].slice(0, 2)
        if (!['KH', 'MH'].includes(key)) {
          const keyT = programmeKeys[i + 1][1].slice(0, 1)
          const keyLis = programmeKeys[i + 1][1].slice(0, 3)
          if (keyT === 'T') {
            key = keyT
          } else if (keyLis === 'LIS') {
            key = keyLis
          } else {
            key = 'OTHER'
          }
        }
        if (
          !programmeKeys[i + 1][1].includes(faculty.code) &&
          (programmeKeys[i + 1][1].startsWith('MH') || programmeKeys[i + 1][1].startsWith('KH'))
        ) {
          plotLinePlaces.push([i + 1, `${options[key]} secondary`])
        } else {
          plotLinePlaces.push([i + 1, options[key]])
        }
      }
    }
    return plotLinePlaces
  }

  return (
    <div className="faculty-overview">
      <div className="toggle-container">
        <Toggle
          cypress="YearToggle"
          toolTips={toolTips.YearToggle}
          firstLabel="Calendar year"
          secondLabel="Academic year"
          value={academicYear}
          setValue={setAcademicYear}
        />
        <Toggle
          cypress="ProgrammeToggle"
          toolTips={toolTips.ProgrammeToggle}
          firstLabel="New study programmes"
          secondLabel="All study programmes"
          value={studyProgrammes}
          setValue={setStudyProgrammes}
        />
        <Toggle
          cypress="StudentToggle"
          toolTips={toolTips.StudentToggle}
          firstLabel="All studyrights"
          secondLabel="Special studyrights excluded"
          value={specialGroups}
          setValue={setSpecialGroups}
        />
      </div>

      {isFetchingOrLoading ? (
        <Loader active style={{ marginTop: '15em' }} />
      ) : (
        <>
          {studyProgrammeFilter === 'ALL_PROGRAMMES' && (
            <Message data-cy="FacultyProgrammesShownInfo">
              Please note that the data is complete only for current Bachelor, Masters and Doctoral programmes.
              Especially, credits and thesis writers contain only data for current programmes.
            </Message>
          )}
          {special === 'SPECIAL_EXCLUDED' && (
            <Message data-cy="FacultyExcludeSpecialsInfo">
              Please note: exluding the special studyrights does not have any effects to credits produced by faculty
              -view.
            </Message>
          )}
          {basics.isSuccess && basics.data && (
            <>
              {getDivider(
                'Students of the faculty',
                'StudentsOfTheFaculty',
                basics?.data?.studentInfo.titles,
                basics?.data?.studentInfo.tableStats,
                basics?.data?.studentInfo.programmeTableStats,
                basics?.data?.programmeNames
              )}
              <div className="section-container">
                <div className="graph-container-narrow">
                  <LineGraph
                    cypress="StudentsOfTheFaculty"
                    data={{ ...basics?.data.studentInfo, years: basics.data.years }}
                  />
                </div>
                <div className="table-container-wide">
                  <InteractiveDataTable
                    cypress="StudentsOfTheFaculty"
                    dataStats={basics?.data?.studentInfo.tableStats}
                    dataProgrammeStats={basics?.data?.studentInfo.programmeTableStats}
                    programmeNames={basics?.data?.programmeNames}
                    sortedKeys={sortProgrammeKeys(
                      Object.keys(basics?.data?.studentInfo.programmeTableStats).map(obj => [
                        obj,
                        basics?.data?.programmeNames[obj].code,
                      ]),
                      faculty.code
                    ).map(listObj => listObj[0])}
                    plotLinePlaces={getChartPlotLinePlaces(
                      sortProgrammeKeys(
                        Object.keys(basics?.data?.studentInfo.programmeTableStats).map(obj => [
                          obj,
                          basics?.data?.programmeNames[obj].code,
                        ]),
                        faculty.code
                      )
                    )}
                    titles={basics?.data?.studentInfo.titles}
                    sliceStart={1}
                    yearsVisible={Array(basics?.data?.studentInfo.tableStats.length).fill(false)}
                    shortNames={transferShortTitles}
                  />
                </div>
              </div>
            </>
          )}
          {basics.isSuccess && basics.data && (
            <>
              {getDivider(
                'Graduated of the faculty',
                'GraduatedOfTheFaculty',
                basics?.data?.graduationInfo.titles,
                basics?.data?.graduationInfo.tableStats,
                basics?.data?.graduationInfo.programmeTableStats,
                basics?.data?.programmeNames
              )}
              <div className="section-container">
                <div className="graph-container-narrow">
                  <LineGraph
                    cypress="GraduatedOfTheFaculty"
                    data={{ ...basics?.data.graduationInfo, years: basics.data.years }}
                  />
                </div>
                <div className="table-container-wide">
                  <InteractiveDataTable
                    cypress="GraduatedOfTheFaculty"
                    dataStats={basics?.data?.graduationInfo.tableStats}
                    dataProgrammeStats={basics?.data?.graduationInfo.programmeTableStats}
                    programmeNames={basics?.data?.programmeNames}
                    sortedKeys={sortProgrammeKeys(
                      Object.keys(basics?.data?.graduationInfo.programmeTableStats).map(obj => [
                        obj,
                        basics?.data?.programmeNames[obj].code,
                      ]),
                      faculty.code
                    ).map(listObj => listObj[0])}
                    plotLinePlaces={getChartPlotLinePlaces(
                      sortProgrammeKeys(
                        Object.keys(basics?.data?.graduationInfo.programmeTableStats).map(obj => [
                          obj,
                          basics?.data?.programmeNames[obj].code,
                        ]),
                        faculty.code
                      )
                    )}
                    titles={basics?.data?.graduationInfo.titles}
                    sliceStart={2}
                    yearsVisible={Array(basics?.data?.graduationInfo.tableStats.length).fill(false)}
                  />
                </div>
              </div>
            </>
          )}
          {thesisWriters.isSuccess && thesisWriters.data && (
            <>
              {getDivider(
                'Thesis writers of the faculty',
                'ThesisWritersOfTheFaculty',
                thesisWriters?.data?.titles,
                thesisWriters?.data.tableStats,
                thesisWriters?.data.programmeTableStats,
                thesisWriters?.data?.programmeNames
              )}
              <div className="section-container">
                <div className="graph-container-narrow">
                  <LineGraph
                    cypress="ThesisWritersOfTheFaculty"
                    data={{ ...thesisWriters?.data, years: thesisWriters?.data.years }}
                  />
                </div>
                <div className="table-container-wide">
                  <InteractiveDataTable
                    cypress="ThesisWritersOfTheFaculty"
                    dataStats={thesisWriters?.data.tableStats}
                    dataProgrammeStats={thesisWriters?.data.programmeTableStats}
                    programmeNames={thesisWriters?.data.programmeNames}
                    sortedKeys={sortProgrammeKeys(
                      Object.keys(thesisWriters?.data.programmeTableStats).map(obj => [
                        obj,
                        thesisWriters?.data?.programmeNames[obj].code,
                      ]),
                      faculty.code
                    ).map(listObj => listObj[0])}
                    plotLinePlaces={getChartPlotLinePlaces(
                      sortProgrammeKeys(
                        Object.keys(thesisWriters?.data?.programmeTableStats).map(obj => [
                          obj,
                          thesisWriters?.data?.programmeNames[obj].code,
                        ]),
                        faculty.code
                      )
                    )}
                    titles={thesisWriters?.data?.titles}
                    sliceStart={2}
                    yearsVisible={Array(thesisWriters?.data.tableStats.length).fill(false)}
                  />
                </div>
              </div>
            </>
          )}
          {credits.isSuccess && credits.data && (
            <>
              {getDivider(
                'Credits produced by the faculty',
                'CreditsProducedByTheFaculty',
                credits?.data?.titles,
                credits?.data?.tableStats,
                credits?.data?.programmeTableStats,
                credits?.data?.programmeNames
              )}
              <div className="section-container">
                <div className="graph-container-narrow">
                  <StackedBarChart
                    cypress="CreditsProducedByTheFaculty"
                    data={credits?.data?.graphStats}
                    labels={credits?.data?.years}
                    wideTable="narrow"
                  />
                </div>
                <div className="table-container-wide">
                  <InteractiveDataTable
                    cypress="CreditsProducedByTheFaculty"
                    dataStats={credits?.data?.tableStats}
                    dataProgrammeStats={credits?.data?.programmeTableStats}
                    programmeNames={credits?.data?.programmeNames}
                    sortedKeys={sortProgrammeKeys(
                      Object.keys(credits?.data.programmeTableStats).map(obj => [
                        obj,
                        credits?.data?.programmeNames[obj].code,
                      ]),
                      faculty.code
                    ).map(listObj => listObj[0])}
                    plotLinePlaces={getChartPlotLinePlaces(
                      sortProgrammeKeys(
                        Object.keys(credits?.data?.programmeTableStats).map(obj => [
                          obj,
                          credits?.data?.programmeNames[obj].code,
                        ]),
                        faculty.code
                      )
                    )}
                    titles={credits?.data?.titles}
                    sliceStart={2}
                    yearsVisible={Array(credits?.data?.tableStats.length).fill(false)}
                    shortNames={creditShortTitles}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Overview
