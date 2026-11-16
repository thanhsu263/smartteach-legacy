# Local visual QA using installed Microsoft Word. No uploads or AI calls.
# Opens generated DOCX read-only and exports only into rag-documents/qa/render.
$ErrorActionPreference = 'Stop'
$ragRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$ragManifest = Get-Content -LiteralPath (Join-Path $ragRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$ragWord = $null
$ragResults = @()
try {
    $ragWord = New-Object -ComObject Word.Application
    $ragWord.Visible = $false
    $ragWord.DisplayAlerts = 0
    foreach ($ragEntry in $ragManifest.documents) {
        $ragInput = [IO.Path]::GetFullPath((Join-Path $ragRoot $ragEntry.uploadFile))
        $ragOutput = [IO.Path]::GetFullPath((Join-Path $ragRoot "qa/render/$($ragEntry.id)"))
        if (-not $ragInput.StartsWith($ragRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
            -not $ragOutput.StartsWith($ragRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Render path must stay inside the corpus directory.'
        }
        New-Item -ItemType Directory -Path $ragOutput -Force | Out-Null
        $ragDocument = $null
        try {
            $ragDocument = $ragWord.Documents.Open($ragInput, $false, $true, $false)
            $ragDocument.Repaginate()
            $ragPages = $ragDocument.ComputeStatistics(2)
            $ragPdf = Join-Path $ragOutput "$($ragEntry.id).pdf"
            $ragDocument.ExportAsFixedFormat($ragPdf, 17)
            $ragResults += [pscustomobject]@{ id = $ragEntry.id; pages = $ragPages; pdf = $ragPdf }
            Write-Output "$($ragEntry.id): $ragPages pages"
        }
        finally {
            if ($null -ne $ragDocument) {
                $ragDocument.Close(0)
                [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ragDocument)
            }
        }
    }
    $ragResults | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $ragRoot 'qa/render/word-render.json') -Encoding UTF8
}
finally {
    if ($null -ne $ragWord) {
        $ragWord.Quit()
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ragWord)
    }
}
