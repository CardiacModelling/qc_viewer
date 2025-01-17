
var qc_results = {};
var protocol = "";

var protocols = [];

var exclude_wells_failing = [];
var show_wells_passing = [];

var criteria = {};

function resetView(){
    exclude_wells_failing = [];
    show_wells_passing = [];
}

function reverseString(str) {
    return str.split( '' ).reverse( ).join( '' );
}

function wellLabel(row, column){
    var chars = "ABCDEFGHIJKLMNOP";

    row_char = chars[row];

    column_str = String(Math.floor(column/10)) + String(column % 10);

    return row_char + column_str;
}

function createGrid(){
    var tbl = document.getElementById("qc_grid");

    var row = tbl.insertRow(0);
    var row_labels = "ABCDEFGHIJKLMNOP";

    cell = row.insertCell();
    cell.class = "qc_grid_column_labels";

    for (i = 0; i < 24; i++){
        var cell = row.insertCell();
        cell.innerHTML = String(Math.floor((i + 1)/10)) + String((i + 1)% 10);
        cell.class = "qc_grid_column_labels";
    }

    for (j = 0; j < row_labels.length; j++){
        row = tbl.insertRow(0);
        row.id = `qc_grid_row_${row_labels[row_labels.length - j - 1]}`;
        cell = row.insertCell();
        cell.class = "qc_grid_row_labels";
        cell.innerHTML = reverseString(row_labels)[j];

        for (i = 1; i < 25; i++){
            cell = row.insertCell();
            cell.id = `qc_grid_cell_${wellLabel(row_labels.length - j - 1, i)}`;
            cell.classList.add('tile');
            cell.title = wellLabel(row_labels.length - j - 1, i);
        }
    }
}

function onQCFileSelect(e){
    f = e.target.files[0];
    loadQCFile(f);
}

function loadQCFile(f){
    reader = new FileReader();

    reader.addEventListener("load", () => {
        // this will then display a text file
        qc_results = JSON.parse(reader.result);
        updateCriteria();
        updateProtocolList();
        updateViewer();
    }, false);

    reader.readAsText(f);
}

function updateProtocolList(){
    protocols = new Set(qc_results.map(function f(x){return x["protocol"];}));

    selection = document.getElementById('protocol_selection');

    // remove options
    while(selection.options.length > 0){
        selection.remove(0);
    }

    protocols.forEach(function f(x){
        option = new Option(x, 'protocol_' + x);
        option.value = x;
        selection.add(option, undefined);
    });
}

function updateCriteria(){
    passing_criteria_selection_div = document.getElementById("passing_criteria_selection");
    ignore_criteria_selection_div = document.getElementById("ignore_criteria_selection");

    passing_criteria_selection_div.innerHTML = '';
    ignore_criteria_selection_div.innerHTML = '';

    keys = Object.keys(qc_results[0]);

    criteria = keys.filter(function(x){return x != 'protocol' && x != "well" && x != "experiment";});

    for (let criterium in criteria){
        criterium = criteria[criterium];

        var div = document.createElement('div');
        div.class = "checkbox_option";
        passing_criteria_selection_div.appendChild(div);

        var input = document.createElement("input");
        input.type = "checkbox";
        input.className = "criteria_selection_box"; // set the CSS class
        input.id = 'show_' + criterium;
        input.value = 'show_' + criterium;
        input.onclick= function f(){updateViewer()};
        div.appendChild(input); // put it into the DOM
        var label = document.createElement("label");
        label.for = input.id;
        label = div.appendChild(label); // put it into the DOM
        label.innerHTML = criterium;

        div = document.createElement('div');
        div.class = "checkbox_option";
        ignore_criteria_selection_div.appendChild(div);

        input = document.createElement("input");
        input.type = "checkbox";
        input.value = 'ignore_' + criterium;
        input.id = 'ignore_' + criterium;
        input.className = "criteria_ignore_box"; // set the CSS class
        input.onclick = function f(){updateViewer()};
        div.appendChild(input); // put it into the DOM

        label = document.createElement("label");
        label.for = input.id;
        label = div.appendChild(label); // put it into the DOM
        label.innerHTML = criterium;
    }
}

function get_criteria_to_pass(){
    return criteria.filter(function(x){
        return document.getElementById("show_" + x).checked;
    });
}

function get_criteria_to_ignore(){
    return criteria.filter(function(x){
        return document.getElementById("ignore_" + x).checked;
    });
}

function get_tile_by_id(well){
    div_id = `qc_grid_cell_${well}`;
    div = document.getElementById(div_id);
    return div;
}

function updateViewer(){
    criteria_to_pass = get_criteria_to_pass();
    ignore_criteria = get_criteria_to_ignore();

    var selector = document.getElementById("protocol_selection");
    protocol = selector.value;

    tiles = document.getElementsByClassName('tile');

    for(i in tiles){
        if(tiles[i].style == null){
            break;
        }
        else{
            tiles[i].style.background = '#eee4da';
        }
    }

    no_wells = 0;
    no_wells_passing = 0;
    passed_wells = []
    failed_wells = []

    for(i in qc_results){
        qc_row = qc_results[i];

        if(qc_row['protocol'] != protocol){
            continue;
        }

        well = qc_row['well'];
        tile = get_tile_by_id(well);

        var ignore = false;
        for(j in ignore_criteria){
            criterium = ignore_criteria[j];
            if (String(qc_row[criterium]).toLowerCase() == "false"){
                ignore = true;
                break;
            }
        }

        if(ignore){
            tile.style.background = "#eee4da";
        }

        else{
            var fail = false;
            for(j in criteria_to_pass){
                criterium = criteria_to_pass[j];
                if (String(qc_row[criterium]).toLowerCase() == "false"){
                    fail = true;
                    break;
                }
            }
            if(fail){
                tile.style.background='#e41a1c';
                failed_wells.push(well);
            }
            else{
                tile.style.background='#4daf4a';
                no_wells_passing += 1;
                passed_wells.push(well);
            }
            no_wells += 1;
        }
    }

    passing_element = document.getElementById('no_wells_passing');
    passing_element.innerHTML = no_wells_passing;

    no_wells_element = document.getElementById('no_wells');
    no_wells_element.innerHTML = no_wells;

    passed_wells_element = document.getElementById('passed_wells');
    failed_wells_element = document.getElementById('failed_wells');
    passed_wells_element.innerHTML = passed_wells.join(' ');
    failed_wells_element.innerHTML = failed_wells.join(' ');

}

function selectAllPassing(){
    var checkboxes = document.getElementsByClassName("criteria_selection_box");
    for(i in checkboxes){
        checkboxes[i].checked = true;
    }
    updateViewer();
}

function selectAllIgnore(){
    var checkboxes = document.getElementsByClassName("criteria_ignore_box");
    for(i in checkboxes)
        checkboxes[i].checked = true;
    updateViewer();
}

function clearPassingSelection(){
    var checkboxes = document.getElementsByClassName("criteria_selection_box");
    for(i in checkboxes)
        checkboxes[i].checked = false;
    updateViewer();
}

function clearIgnoreSelection(){
    var checkboxes = document.getElementsByClassName("criteria_ignore_box");
    for(i in checkboxes)
        checkboxes[i].checked = false;
    updateViewer();
}

createGrid();

default_qc_file = '/qc_viewer/data/QC-fluoride_free.json';
fetch(default_qc_file).then(r => r.json()).then(r => {qc_results = r;
                                                      console.log(r);
                                                      updateCriteria();
                                                      updateProtocolList();
                                                      updateViewer();
});
